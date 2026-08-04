const API_KEY = "919ded7fc3c2a2a1e394a33c5678d557";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const NO_IMAGE = "https://placehold.co/300x450/1a1a1a/f1f1f1?text=No+Image";

const [movieGrid, prevBtn, nextBtn, pageInfo, resultsNote, searchForm, searchInput, pageTitle, detailsView,
  filterBarHome, filterBarMovies, filterBarSeries, genreFilterMovies, sortFilterMovies, genreFilterSeries, sortFilterSeries,
  heroBanner, heroType, heroTitle, heroRating, heroDate, heroOverview, heroDetailsBtn, heroPrevBtn, heroNextBtn, searchBtn] =
  ["movieGrid", "prevBtn", "nextBtn", "pageInfo", "resultsNote", "searchForm", "searchInput", "pageTitle", "detailsView",
   "filterBar-home", "filterBar-movies", "filterBar-series", "genreFilter-movies", "sortFilter-movies", "genreFilter-series", "sortFilter-series",
   "heroBanner", "heroType", "heroTitle", "heroRating", "heroDate", "heroOverview", "heroDetailsBtn", "heroPrevBtn", "heroNextBtn", "searchBtn"]
  .map((id) => document.getElementById(id));

const navLinks = document.querySelectorAll(".nav-link");
const paginationBar = document.querySelector(".pagination");

let activePage = "home";
let currentItems = [];

let heroItems = [];   
let heroIndex = 0;  

const pageState = {
  home: { currentPage: 1, totalPages: 1, category: "all", search: "" },
  movies: { currentPage: 1, totalPages: 1, genre: "", sort: "popularity.desc", search: "" },
  series: { currentPage: 1, totalPages: 1, genre: "", sort: "popularity.desc", search: "" },
};

const pageTitles = {
  home: "Browse All - Trending This Week",
  movies: "All Movies",
  series: "All TV Series",
  favorites: "My Favourites",
};

function init() {
  loadGenreList("movie", genreFilterMovies);
  loadGenreList("tv", genreFilterSeries);
  loadHeroBanner();
  updateHeroVisibility();
  fetchAndRender();
}

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    const newPage = link.dataset.page;
    if (newPage === activePage) return;

    if (pageState[activePage]) {
      pageState[activePage].search = "";
    }

    activePage = newPage;

    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    detailsView.classList.add("hidden");
    movieGrid.classList.remove("hidden");
    paginationBar.classList.remove("hidden");

    updateHeroVisibility();

    filterBarHome.classList.toggle("hidden", activePage !== "home");
    filterBarMovies.classList.toggle("hidden", activePage !== "movies");
    filterBarSeries.classList.toggle("hidden", activePage !== "series");

    pageTitle.textContent = pageTitles[activePage];

    if (pageState[activePage]) {
      pageState[activePage].search = "";
      pageState[activePage].currentPage = 1;
    }
    searchInput.value = "";
    updateSearchButton();

    fetchAndRender();
  });
});

function buildRequestUrl() {
  const state = pageState[activePage];
  let endpoint = "";
  let params = `api_key=${API_KEY}&page=${state.currentPage}`;

  if (state.search !== "") {
    endpoint = activePage === "movies" ? "/search/movie" : activePage === "series" ? "/search/tv" : "/search/multi";
    params += `&query=${encodeURIComponent(state.search)}`;
  } else if (activePage === "home") {
    endpoint = state.category === "movie" ? "/trending/movie/week" : state.category === "tv" ? "/trending/tv/week" : "/trending/all/week";
  } else if (activePage === "movies") {
    endpoint = "/discover/movie";
    params += `&sort_by=${state.sort}${state.genre ? `&with_genres=${state.genre}` : ""}`;
  } else if (activePage === "series") {
    endpoint = "/discover/tv";
    params += `&sort_by=${state.sort}${state.genre ? `&with_genres=${state.genre}` : ""}`;
  }

  return `${BASE_URL}${endpoint}?${params}`;
}

async function fetchAndRender() {
  if (activePage === "favorites") {
    renderFavouritesPage();
    return;
  }

  movieGrid.innerHTML = `<p class="status-message">Loading...</p>`;

  try {
    const url = buildRequestUrl();
    const response = await fetch(url);
    const data = await response.json();

    pageState[activePage].totalPages = Math.min(data.total_pages || 1, 500);

    renderMovieCards(data.results || []);
    updatePaginationControls();
    updateResultsNote(data.total_results || 0);
  } catch (error) {
    console.log("Something went wrong:", error);
    movieGrid.innerHTML = `<p class="status-message">Could not load data. Please check your internet connection and try again.</p>`;
  }
}

function renderFavouritesPage() {
  const favs = getFavourites();

  renderMovieCards(favs);

  resultsNote.textContent = `${favs.length} titles found`;
  pageInfo.textContent = `Page 1 of 1`;
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

function renderMovieCards(results) {
  const items = results.filter((item) => item.media_type !== "person");

  currentItems = items.map((item) => {
    let type = item.media_type;
    if (activePage === "movies") type = "movie";
    if (activePage === "series") type = "tv";
    return { ...item, media_type: type };
  });

  if (currentItems.length === 0) {
    movieGrid.innerHTML =
      activePage === "favorites"
        ? `<p class="status-message">You haven't added any favourites yet. Click the heart icon on a movie or series to add it here.</p>`
        : `<p class="status-message">No results found. Try a different search or filter.</p>`;
    return;
  }

  let cardsHtml = "";

  currentItems.forEach((item) => {
    const type = item.media_type;
    const title = item.title || item.name || "Untitled";
    const date = item.release_date || item.first_air_date || "Unknown date";
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
    const poster = item.poster_path ? IMG_URL + item.poster_path : NO_IMAGE;
    const isFav = isFavourited(item.id, type);

    const typeBadge =
      activePage === "home" || activePage === "favorites"
        ? `<span class="type-badge">${type === "movie" ? "Movie" : "TV"}</span>`
        : "";

    cardsHtml += `
      <div class="movie-card">
        <div class="poster-wrap">
          <img src="${poster}" alt="${title}" loading="lazy" />
          <span class="rating-badge">${rating}</span>
          ${typeBadge}
        </div>
        <div class="movie-info">
          <div class="title-row">
            <h3>${title}</h3>
            <button class="fav-btn ${isFav ? "active" : ""}" data-id="${item.id}" data-type="${type}" onclick="toggleFavourite(event, ${item.id}, '${type}')">&#9829;</button>
          </div>
          <p>${date}</p>
          <button class="details-btn" onclick="viewDetails(${item.id}, '${type}')">View Details</button>
        </div>
      </div>
    `;
  });

  movieGrid.innerHTML = cardsHtml;
}

async function viewDetails(id, type) {
  [filterBarHome, filterBarMovies, filterBarSeries].forEach((el) => el.classList.add("hidden"));
  movieGrid.classList.add("hidden");
  paginationBar.classList.add("hidden");
  heroBanner.classList.add("hidden");

  detailsView.classList.remove("hidden");
  detailsView.innerHTML = `<p class="status-message">Loading...</p>`;
  window.scrollTo({ top: 0, behavior: "smooth" });

  try {
    const url = `${BASE_URL}/${type}/${id}?api_key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    renderDetails(data, type);
  } catch (error) {
    console.log("Something went wrong:", error);
    detailsView.innerHTML = `<p class="status-message">Could not load details. Please try again.</p>`;
  }
}

function formatMoney(amount) {
  return amount ? `$${amount.toLocaleString()}` : "N/A";
}

function renderDetails(data, type) {
  const title = data.title || data.name || "Untitled";
  const date = data.release_date || data.first_air_date || "Unknown date";
  const rating = data.vote_average ? data.vote_average.toFixed(1) : "N/A";
  const voteCount = data.vote_count ? data.vote_count.toLocaleString() : "0";
  const poster = data.poster_path ? IMG_URL + data.poster_path : NO_IMAGE;
  const backdrop = data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : "";

  const joinNames = (arr) => (arr && arr.length ? arr.map((x) => x.name).join(", ") : "N/A");
  const genrePills = data.genres && data.genres.length ? data.genres.map((g) => `<span class="pill">${g.name}</span>`).join("") : `<span class="pill">N/A</span>`;
  const languages = data.spoken_languages && data.spoken_languages.length ? data.spoken_languages.map((l) => l.english_name || l.name).join(", ") : "N/A";
  const companies = joinNames(data.production_companies);
  const originalLang = data.original_language ? data.original_language.toUpperCase() : "N/A";

  const extraItem = ([label, value]) => `<div class="extra-item"><strong>${label}:</strong> ${value}</div>`;

  let runtime, extraRows;

  if (type === "movie") {
    runtime = data.runtime ? `${data.runtime} min` : "N/A";
    extraRows = [
      ["Status", data.status || "N/A"],
      ["Budget", formatMoney(data.budget)],
      ["Revenue", formatMoney(data.revenue)],
      ["Original Language", originalLang],
      ["Spoken Languages", languages],
      ["Production", companies],
    ];
  } else {
    runtime = data.number_of_seasons ? `${data.number_of_seasons} Season(s)` : "N/A";
    extraRows = [
      ["Status", data.status || "N/A"],
      ["Episodes", data.number_of_episodes || "N/A"],
      ["Last Air Date", data.last_air_date || "N/A"],
      ["Networks", joinNames(data.networks)],
      ["Created By", joinNames(data.created_by)],
      ["Original Language", originalLang],
      ["Production", companies],
    ];
  }

  const homepageBtn = data.homepage
    ? `<a href="${data.homepage}" target="_blank" class="homepage-btn">Visit Official Website &#8599;</a>`
    : "";

  detailsView.innerHTML = `
    <button class="back-btn" onclick="goBackHome()">&#8592; Back to Browse All</button>
    ${backdrop ? `<div class="details-banner" style="background-image: url('${backdrop}')"></div>` : ""}
    <div class="details-content">
      <img src="${poster}" alt="${title}" class="details-poster" />
      <div class="details-info">
        <h2>${title}</h2>
        ${data.tagline ? `<p class="tagline">"${data.tagline}"</p>` : ""}
        <p class="details-meta">${date} &bull; &#9733; ${rating} (${voteCount} votes) &bull; ${runtime}</p>
        <div class="genre-pills">${genrePills}</div>
        <p class="details-overview">${data.overview || "No description available."}</p>
        <div class="details-extra-grid">${extraRows.map(extraItem).join("")}</div>
        ${homepageBtn}
      </div>
    </div>
  `;
}

function goBackHome() {
  detailsView.classList.add("hidden");
  movieGrid.classList.remove("hidden");
  paginationBar.classList.remove("hidden");

  activePage = "home";
  navLinks.forEach((l) => l.classList.remove("active"));
  document.querySelector('.nav-link[data-page="home"]').classList.add("active");

  updateHeroVisibility(); 

  filterBarHome.classList.remove("hidden");
  filterBarMovies.classList.add("hidden");
  filterBarSeries.classList.add("hidden");
  pageTitle.textContent = pageTitles.home;

  pageState.home.search = "";
  pageState.home.currentPage = 1;
  searchInput.value = "";
  updateSearchButton();
  fetchAndRender();
}

function updatePaginationControls() {
  const state = pageState[activePage];
  pageInfo.textContent = `Page ${state.currentPage} of ${state.totalPages}`;
  prevBtn.disabled = state.currentPage <= 1;
  nextBtn.disabled = state.currentPage >= state.totalPages;
}

function changePage(step) {
  if (activePage === "favorites") return;
  const state = pageState[activePage];
  const newPage = state.currentPage + step;
  if (newPage < 1 || newPage > state.totalPages) return;
  state.currentPage = newPage;
  fetchAndRender();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
prevBtn.addEventListener("click", () => changePage(-1));
nextBtn.addEventListener("click", () => changePage(1));

function updateResultsNote(totalResults) {
  const state = pageState[activePage];
  resultsNote.textContent = state.search ? `${totalResults} results for "${state.search}"` : `${totalResults} titles found`;
}

function updateSearchButton() {
  const isActive = activePage !== "favorites" && pageState[activePage] && pageState[activePage].search !== "";
  searchBtn.textContent = isActive ? "\u00D7" : "Search";
  searchBtn.classList.toggle("clear-mode", isActive);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (activePage === "favorites") return;

  if (searchBtn.classList.contains("clear-mode")) {
    searchInput.value = "";
    pageState[activePage].search = "";
    pageState[activePage].currentPage = 1;
    updateSearchButton();
    updateHeroVisibility();
    fetchAndRender();
    return;
  }

  pageState[activePage].search = searchInput.value.trim();
  pageState[activePage].currentPage = 1;
  updateSearchButton();
  updateHeroVisibility();
  fetchAndRender();
});

async function loadGenreList(type, selectElement) {
  try {
    const url = `${BASE_URL}/genre/${type}/list?api_key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    data.genres.forEach((genre) => {
      const option = document.createElement("option");
      option.value = genre.id;
      option.textContent = genre.name;
      selectElement.appendChild(option);
    });
  } catch (error) {
    console.log("Could not load genres:", error);
  }
}

function setupFilterListener(el, page, field) {
  el.addEventListener("change", () => {
    pageState[page][field] = el.value;
    pageState[page].search = "";
    searchInput.value = "";
    updateSearchButton();
    pageState[page].currentPage = 1;
    fetchAndRender();
  });
}
setupFilterListener(genreFilterMovies, "movies", "genre");
setupFilterListener(sortFilterMovies, "movies", "sort");
setupFilterListener(genreFilterSeries, "series", "genre");
setupFilterListener(sortFilterSeries, "series", "sort");

function getFavourites() {
  return JSON.parse(localStorage.getItem("favourites") || "[]");
}

function saveFavourites(favs) {
  localStorage.setItem("favourites", JSON.stringify(favs));
}

function isFavourited(id, type) {
  return getFavourites().some((f) => f.id === id && f.media_type === type);
}

function toggleFavourite(event, id, type) {
  event.stopPropagation();

  let favs = getFavourites();
  const exists = favs.some((f) => f.id === id && f.media_type === type);

  if (exists) {
    favs = favs.filter((f) => !(f.id === id && f.media_type === type));
  } else {
    const item = currentItems.find((i) => i.id === id && i.media_type === type);
    if (item) favs.push(item);
  }

  saveFavourites(favs);

  if (activePage === "favorites") {
    renderFavouritesPage();
  } else {
    event.currentTarget.classList.toggle("active");
  }
}

function updateHeroVisibility() {
  const shouldShow = activePage === "home" && pageState.home.search === "";
  heroBanner.classList.toggle("hidden", !shouldShow);
}

async function loadHeroBanner() {
  try {
    const url = `${BASE_URL}/trending/all/week?api_key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    const results = (data.results || []).filter(
      (item) => item.media_type !== "person" && item.backdrop_path
    );

    if (results.length === 0) return;
    const shuffled = results.sort(() => Math.random() - 0.5);
    heroItems = shuffled.slice(0, 5);
    heroIndex = 0;
    renderHeroBanner();
  } catch (error) {
    console.log("Hero banner load nahi ho saki:", error);
  }
}

function renderHeroBanner() {
  if (heroItems.length === 0) return;

  const item = heroItems[heroIndex];
  const title = item.title || item.name || "Untitled";
  const date = item.release_date || item.first_air_date || "Unknown date";
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
  const backdrop = `https://image.tmdb.org/t/p/original${item.backdrop_path}`;

  heroBanner.style.backgroundImage = `url('${backdrop}')`;
  heroType.textContent = item.media_type === "movie" ? "Movie" : "TV Series";
  heroTitle.textContent = title;
  heroRating.textContent = rating;
  heroDate.textContent = date;
  heroOverview.textContent = item.overview || "No description available.";
}
function changeHeroSlide(step) {
  if (heroItems.length === 0) return;
  heroIndex = (heroIndex + step + heroItems.length) % heroItems.length;
  renderHeroBanner();
}

heroPrevBtn.addEventListener("click", () => changeHeroSlide(-1));
heroNextBtn.addEventListener("click", () => changeHeroSlide(1));
heroDetailsBtn.addEventListener("click", () => {
  if (heroItems.length > 0) {
    const item = heroItems[heroIndex];
    viewDetails(item.id, item.media_type);
  }
});

init();