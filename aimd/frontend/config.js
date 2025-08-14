// frontend/config.js

let API_BASE_URL;

// Check if the hostname is 'localhost' or a local IP address.
// This is how we know we are in a development environment.
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  // If we are local, point to the local backend server.
  API_BASE_URL = "http://localhost:3000";
} else {
  // If we are NOT local (i.e., on your GitHub Pages site),
  // point to your live production server.
  // IMPORTANT: Replace the placeholder with your real Droplet IP address.
  API_BASE_URL = "http://146.190.168.226:3000";
}
