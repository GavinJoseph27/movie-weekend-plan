// DOM references
const select = document.getElementById("features");
const form = document.getElementById("buttons");

// Global state
let currentService = null;
let currentGenre = "All";

// Stores movies selected per service
const order = {};

// Create and append a dropdown option for each service
function populateDropdown() {
  streamingServices.forEach(service => {
    const option = document.createElement("option");
    option.value = service.id; // id used to fetch full service data later
    option.textContent = service.name;
    select.appendChild(option);
  });
}

// Show service info when dropdown selection changes
select.addEventListener("change", function() {
    const id = this.value;

  // Reset UI when a new service is selected
  currentService = null;
  currentGenre = "All";
  document.getElementById("para").style.display = "none";
  document.getElementById("para2").style.display = "none";
  document.getElementById("content-columns").classList.remove("show");

  fetch(`/services/${id}`, {
    headers: { 'Accept': 'application/json' }
  })
    .then(res => res.json())
    .then(data => {
      currentService = data;

      // Initialise order entry for this service if it doesn't exist yet
      if (!order[data.name]) {
        order[data.name] = [];
      }

      // Show service info 
      const para = document.getElementById("para");
      para.innerHTML = "";
      const p = document.createElement("p");
      p.textContent = `Service: ${data.name} | Min Order: $${data.minOrder} | Fee: $${data.serviceFee}`;
      para.appendChild(p);
      para.style.display = "inline-block";
    })
    .catch(err => console.error("Error loading service data:", err));
});

// Generate genre buttons on form submit
form.addEventListener("submit", function(e) {
  e.preventDefault();
  if (!currentService) return;

  const para2 = document.getElementById("para2");
  para2.innerHTML = "";

  // "All" genre button
  const p2 = document.createElement("button");
  p2.type = "button";
  p2.className = "genre";
  p2.textContent = "All";
  p2.addEventListener("click", () => displayMovies("All"));
  para2.appendChild(p2);

  // Create buttons for each genre
  const genres = Object.keys(currentService.genres);
  genres.forEach(genre => {
    const genreButton = document.createElement("button");
    genreButton.type = "button";
    genreButton.className = "genre";
    genreButton.textContent = genre;
    genreButton.addEventListener("click", () => displayMovies(genre));
    para2.appendChild(genreButton);
  });

  para2.style.display = "flex";
  displayMovies("All");
});

// Display movies for selected genre and service
function displayMovies(genre) {
    currentGenre = genre;
    document.getElementById("content-columns").classList.add("show");
    renderOrderSummary();
    
    // Update active genre button
    document.querySelectorAll(".genre").forEach(btn => {
      btn.classList.remove("active");
      if (btn.textContent === genre) {
        btn.classList.add("active");
      }
    });
  
    const moviesCell = document.getElementById("movies-cell");
    moviesCell.innerHTML = "";
  
    // Update movies column heading
    const heading = document.createElement("h3");
    heading.textContent = genre === "All" ? "All Movies" : `${genre} Movies`;
    moviesCell.appendChild(heading);
  
    // Collect movies to display
    let moviesToDisplay = [];
  
    if (genre === "All") {
      Object.values(currentService.genres).forEach(genreMovies => {
        moviesToDisplay.push(...genreMovies);
      });
    } else {
      moviesToDisplay = currentService.genres[genre];
    }
  
    // Display movies
    moviesToDisplay.forEach(movie => {
      const movieDiv = document.createElement("div");
      movieDiv.className = "movie-item";
  
      // Check if movie already selected
      const isSelected = order[currentService.name]
        .some(m => m.id === movie.id);
  
      // Select/unselect icon
      const selectImg = document.createElement("img");
      selectImg.src = isSelected ? "/images/selected.svg" : "/images/unselected.svg";
      selectImg.alt = isSelected ? "Selected" : "Unselected";
      selectImg.className = "select-icon";
      selectImg.style.width = "20px";
      selectImg.style.cursor = "pointer";
  
      selectImg.addEventListener("click", () => toggleMovie(movie));
  
      // Movie details
      const title = document.createElement("h4");
      title.textContent = `${movie.title} (${movie.year})`;
  
      const desc = document.createElement("p");
      desc.textContent = movie.description;
  
      const price = document.createElement("p");
      price.innerHTML = `<strong>Price: $${movie.price.toFixed(2)}</strong>`;
  
      movieDiv.appendChild(selectImg);
      movieDiv.appendChild(title);
      movieDiv.appendChild(desc);
      movieDiv.appendChild(price);
  
      moviesCell.appendChild(movieDiv);
    });
}

// Calculate totals, fees, tax, and final amount
function calculateTotals() {
    let movieTotal = 0;
    let serviceFeeTotal = 0;
    const feeDetails = [];
  
    // Loop through each service and accumulate totals for services with selected movies
    streamingServices.forEach(service => {
      const movies = order[service.name] || [];
      if (movies.length > 0) {
        const serviceMovieTotal = movies.reduce((sum, m) => sum + m.price, 0);
        movieTotal += serviceMovieTotal;
        serviceFeeTotal += service.serviceFee;
        feeDetails.push({ name: service.name, fee: service.serviceFee });
      }
    });
  
    const subtotal = movieTotal + serviceFeeTotal;
    const tax = subtotal * 0.13;
    const total = subtotal + tax;
  
    return { movieTotal, serviceFeeTotal, feeDetails, subtotal, tax, total };
}
  
// Render selected movies and order summary
function renderOrderSummary() {
    const orderCell = document.getElementById("order-cell");
    orderCell.innerHTML = "";
  
    let hasItems = false;
  
    // Loop through each service and display its selected movies
    Object.keys(order).forEach(serviceName => {
      if (order[serviceName].length > 0) {
        hasItems = true;
  
        // Service name heading
        const serviceHeading = document.createElement("h3");
        serviceHeading.textContent = serviceName;
        orderCell.appendChild(serviceHeading);
  
        // Display each selected movie with a remove button
        order[serviceName].forEach(movie => {
          const itemDiv = document.createElement("div");
          itemDiv.className = "order-item";
  
          // Movie title, year and price
          const text = document.createElement("span");
          text.textContent = `${movie.title} (${movie.year}) - $${movie.price.toFixed(2)}`;
  
          // Remove movie button
          const removeImg = document.createElement("img");
          removeImg.src = "/images/remove.svg";
          removeImg.style.width = "16px";
          removeImg.style.cursor = "pointer";
  
          removeImg.addEventListener("click", () => {
            if (confirm("Remove this movie from your order?")) {
              const index = order[serviceName].findIndex(m => m.id === movie.id);
              order[serviceName].splice(index, 1);
              displayMovies(currentGenre);
            }
          });
  
          itemDiv.appendChild(text);
          itemDiv.appendChild(removeImg);
          orderCell.appendChild(itemDiv);
        });
      }
    });
  
    // Show placeholder if no movies selected
    if (!hasItems) {
      orderCell.textContent = "No movies selected.";
      return;
    }
  
    // Calculate and display service fees breakdown
    const totals = calculateTotals();
  
    const feeDiv = document.createElement("div");
    feeDiv.innerHTML = "<h4>Service Fees</h4>";
    totals.feeDetails.forEach(f =>
      feeDiv.innerHTML += `${f.name}: $${f.fee.toFixed(2)}<br>`
    );
    feeDiv.innerHTML += `<strong>Total Fees: $${totals.serviceFeeTotal.toFixed(2)}</strong>`;
    orderCell.appendChild(feeDiv);
  
    // Display subtotal, tax and total
    const summaryDiv = document.createElement("div");
    summaryDiv.innerHTML = `
      <p>Subtotal: $${totals.subtotal.toFixed(2)}</p>
      <p>Tax (13%): $${totals.tax.toFixed(2)}</p>
      <p><strong>Total: $${totals.total.toFixed(2)}</strong></p>
    `;
    orderCell.appendChild(summaryDiv);
  
    // Check each service meets its minimum order requirement
    let canSubmit = true;
    streamingServices.forEach(service => {
      const movies = order[service.name] || [];
      if (movies.length > 0) {
        const movieSum = movies.reduce((sum, m) => sum + m.price, 0);
        // Warn user if minimum order not met and block submission
        if (movieSum < service.minOrder) {
          canSubmit = false;
          const msg = document.createElement("p");
          msg.style.color = "yellow";
          msg.textContent =
            `Add $${(service.minOrder - movieSum).toFixed(2)} more to ${service.name} to meet the minimum order.`;
          orderCell.appendChild(msg);
        }
      }
    });
  
    // Show submit button only if all minimum orders are met
    if (canSubmit) {
      const submitBtn = document.createElement("button");
      submitBtn.textContent = "Submit Order";
      submitBtn.id = "subButton";
      submitBtn.addEventListener("click", submitOrder);
      orderCell.appendChild(submitBtn);
    }
}
  
// Finalize order and reset UI
function submitOrder() {
  const totals = calculateTotals();

  const fees = {};
  totals.feeDetails.forEach(f => fees[f.name] = f.fee);

  // Build movies object with only services that have selected movies
  const movies = {};
  Object.keys(order).forEach(serviceName => {
    // Skip services with no movies selected
    if (order[serviceName].length > 0) {
      movies[serviceName] = order[serviceName];
    }
  });

  const orderData = {
    fees,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    movies
  };

  fetch('/submit-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  })
    .then(res => {
      if (res.ok) {
        alert("Order submitted successfully!");

        // Reset all state and UI
        Object.keys(order).forEach(service => order[service] = []);
        currentService = null;
        currentGenre = "All";
        document.getElementById("features").value = "";
        document.getElementById("para").style.display = "none";
        document.getElementById("para2").style.display = "none";
        document.getElementById("content-columns").classList.remove("show");
        document.getElementById("movies-cell").innerHTML = "";
        document.getElementById("order-cell").innerHTML = "";

         // Redirect to stats page
         window.location.href = '/stats';
      }
    })
    .catch(err => console.error("Error submitting order:", err));
}
  
// Add or remove movie from order
function toggleMovie(movie) {
    const serviceName = currentService.name;
    const serviceOrder = order[serviceName];

    const index = serviceOrder.findIndex(m => m.id === movie.id);

    if (index === -1) {
        // add movie
        serviceOrder.push(movie);
    } else {
        // remove movie
        serviceOrder.splice(index, 1);
    }

    // refresh UI
    displayMovies(currentGenre);
    renderOrderSummary();
}

populateDropdown();