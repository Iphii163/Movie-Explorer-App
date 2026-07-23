const API_KEY = "919ded7fc3c2a2a1e394a33c5678d557";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const NO_IMAGE = "https://placehold.co/300x450/1a1a1a/f1f1f1?text=No+Image";

const movieGrid = document.getElementById("movieGrid");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");
const resultsNote = document.getElementById("resultsNote");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const pageTitle = document.getElementById("pageTitle");
const navLinks = document.querySelectorAll(".nav-link");
const paginationBar = document.querySelector(".pagination");

const detailsView = document.getElementById("detailsView");

const filterBarHome = document.getElementById("filterBar-home");
const filterBarMovies = document.getElementById("filterBar-movies");
const filterBarSeries = document.getElementById("filterBar-series");
const categoryToggle = document.getElementById("categoryToggle");
const genreFilterMovies = document.getElementById("genreFilter-movies");
const sortFilterMovies = document.getElementById("sortFilter-movies");
const genreFilterSeries = document.getElementById("genreFilter-series");
const sortFilterSeries = document.getElementById("sortFilter-series");

let activePage = "home";
let currentItems = [];

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
  fetchAndRender();
}

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    const newPage = link.dataset.page;
    if (newPage === activePage) return;

    activePage = newPage;

    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    // if the details page was open, close it and show the grid again
    detailsView.classList.add("hidden");
    movieGrid.classList.remove("hidden");
    paginationBar.classList.remove("hidden");

    filterBarHome.classList.add("hidden");
    filterBarMovies.classList.add("hidden");
    filterBarSeries.classList.add("hidden");

    if (activePage === "home") filterBarHome.classList.remove("hidden");
    if (activePage === "movies") filterBarMovies.classList.remove("hidden");
    if (activePage === "series") filterBarSeries.classList.remove("hidden");

    pageTitle.textContent = pageTitles[activePage];

    if (pageState[activePage]) {
      pageState[activePage].search = "";
      pageState[activePage].currentPage = 1;
    }
    searchInput.value = "";

    fetchAndRender();
  });
});

function buildRequestUrl() {
  const state = pageState[activePage];

  if (state.search !== "") {
    let searchEndpoint = "/search/multi";
    if (activePage === "movies") searchEndpoint = "/search/movie";
    if (activePage === "series") searchEndpoint = "/search/tv";

    return `${BASE_URL}${searchEndpoint}?api_key=${API_KEY}&query=${encodeURIComponent(state.search)}&page=${state.currentPage}`;
  }

  if (activePage === "home") {
    let trendingEndpoint = "/trending/all/week";
    if (state.category === "movie") trendingEndpoint = "/trending/movie/week";
    if (state.category === "tv") trendingEndpoint = "/trending/tv/week";

    return `${BASE_URL}${trendingEndpoint}?api_key=${API_KEY}&page=${state.currentPage}`;
  }

  if (activePage === "movies") {
    let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&page=${state.currentPage}&sort_by=${state.sort}`;
    if (state.genre !== "") url += `&with_genres=${state.genre}`;
    return url;
  }

  if (activePage === "series") {
    let url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&page=${state.currentPage}&sort_by=${state.sort}`;
    if (state.genre !== "") url += `&with_genres=${state.genre}`;
    return url;
  }
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

// fetch and show the full details page for one movie/show
async function viewDetails(id, type) {
  filterBarHome.classList.add("hidden");
  filterBarMovies.classList.add("hidden");
  filterBarSeries.classList.add("hidden");
  movieGrid.classList.add("hidden");
  paginationBar.classList.add("hidden");

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

// turns a number into "$1,234,567" or "N/A" if it's 0/missing
function formatMoney(amount) {
  return amount ? `$${amount.toLocaleString()}` : "N/A";
}

// build the details page HTML - shows most of what the TMDB API returns
function renderDetails(data, type) {
  const title = data.title || data.name || "Untitled";
  const date = data.release_date || data.first_air_date || "Unknown date";
  const rating = data.vote_average ? data.vote_average.toFixed(1) : "N/A";
  const voteCount = data.vote_count ? data.vote_count.toLocaleString() : "0";
  const poster = data.poster_path ? IMG_URL + data.poster_path : NO_IMAGE;
  const backdrop = data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : "";

  const genrePills =
    data.genres && data.genres.length
      ? data.genres.map((g) => `<span class="pill">${g.name}</span>`).join("")
      : `<span class="pill">N/A</span>`;

  const languages =
    data.spoken_languages && data.spoken_languages.length
      ? data.spoken_languages.map((l) => l.english_name || l.name).join(", ")
      : "N/A";

  const companies =
    data.production_companies && data.production_companies.length
      ? data.production_companies.map((c) => c.name).join(", ")
      : "N/A";

  // movie-only and tv-only fields
  let runtime = "N/A";
  let extraRowsHtml = "";

  if (type === "movie") {
    runtime = data.runtime ? `${data.runtime} min` : "N/A";

    extraRowsHtml = `
      <div class="extra-item"><strong>Status:</strong> ${data.status || "N/A"}</div>
      <div class="extra-item"><strong>Budget:</strong> ${formatMoney(data.budget)}</div>
      <div class="extra-item"><strong>Revenue:</strong> ${formatMoney(data.revenue)}</div>
      <div class="extra-item"><strong>Original Language:</strong> ${data.original_language ? data.original_language.toUpperCase() : "N/A"}</div>
      <div class="extra-item"><strong>Spoken Languages:</strong> ${languages}</div>
      <div class="extra-item"><strong>Production:</strong> ${companies}</div>
    `;
  } else {
    runtime = data.number_of_seasons ? `${data.number_of_seasons} Season(s)` : "N/A";

    const networks =
      data.networks && data.networks.length ? data.networks.map((n) => n.name).join(", ") : "N/A";

    const creators =
      data.created_by && data.created_by.length ? data.created_by.map((c) => c.name).join(", ") : "N/A";

    extraRowsHtml = `
      <div class="extra-item"><strong>Status:</strong> ${data.status || "N/A"}</div>
      <div class="extra-item"><strong>Episodes:</strong> ${data.number_of_episodes || "N/A"}</div>
      <div class="extra-item"><strong>Last Air Date:</strong> ${data.last_air_date || "N/A"}</div>
      <div class="extra-item"><strong>Networks:</strong> ${networks}</div>
      <div class="extra-item"><strong>Created By:</strong> ${creators}</div>
      <div class="extra-item"><strong>Original Language:</strong> ${data.original_language ? data.original_language.toUpperCase() : "N/A"}</div>
      <div class="extra-item"><strong>Production:</strong> ${companies}</div>
    `;
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
        <div class="details-extra-grid">${extraRowsHtml}</div>
        ${homepageBtn}
      </div>
    </div>
  `;
}

// "Back" button always returns to the Browse All / Home tab
function goBackHome() {
  detailsView.classList.add("hidden");
  movieGrid.classList.remove("hidden");
  paginationBar.classList.remove("hidden");

  activePage = "home";
  navLinks.forEach((l) => l.classList.remove("active"));
  document.querySelector('.nav-link[data-page="home"]').classList.add("active");

  filterBarHome.classList.remove("hidden");
  filterBarMovies.classList.add("hidden");
  filterBarSeries.classList.add("hidden");
  pageTitle.textContent = pageTitles.home;

  pageState.home.search = "";
  pageState.home.currentPage = 1;
  searchInput.value = "";

  fetchAndRender();
}

function updatePaginationControls() {
  const state = pageState[activePage];
  pageInfo.textContent = `Page ${state.currentPage} of ${state.totalPages}`;
  prevBtn.disabled = state.currentPage <= 1;
  nextBtn.disabled = state.currentPage >= state.totalPages;
}

prevBtn.addEventListener("click", () => {
  if (activePage === "favorites") return;
  const state = pageState[activePage];
  if (state.currentPage > 1) {
    state.currentPage--;
    fetchAndRender();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

nextBtn.addEventListener("click", () => {
  if (activePage === "favorites") return;
  const state = pageState[activePage];
  if (state.currentPage < state.totalPages) {
    state.currentPage++;
    fetchAndRender();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

function updateResultsNote(totalResults) {
  const state = pageState[activePage];
  if (state.search !== "") {
    resultsNote.textContent = `${totalResults} results for "${state.search}"`;
  } else {
    resultsNote.textContent = `${totalResults} titles found`;
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (activePage === "favorites") return;
  pageState[activePage].search = searchInput.value.trim();
  pageState[activePage].currentPage = 1;
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

genreFilterMovies.addEventListener("change", () => {
  pageState.movies.genre = genreFilterMovies.value;
  pageState.movies.search = "";
  searchInput.value = "";
  pageState.movies.currentPage = 1;
  fetchAndRender();
});

sortFilterMovies.addEventListener("change", () => {
  pageState.movies.sort = sortFilterMovies.value;
  pageState.movies.search = "";
  searchInput.value = "";
  pageState.movies.currentPage = 1;
  fetchAndRender();
});

genreFilterSeries.addEventListener("change", () => {
  pageState.series.genre = genreFilterSeries.value;
  pageState.series.search = "";
  searchInput.value = "";
  pageState.series.currentPage = 1;
  fetchAndRender();
});

sortFilterSeries.addEventListener("change", () => {
  pageState.series.sort = sortFilterSeries.value;
  pageState.series.search = "";
  searchInput.value = "";
  pageState.series.currentPage = 1;
  fetchAndRender();
});

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

init();
