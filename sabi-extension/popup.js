document.addEventListener('DOMContentLoaded', function() {
  const testButton = document.getElementById('test-backend');
  const responseDiv = document.getElementById('response');

  testButton.addEventListener('click', function() {
    fetch('http://localhost:3001')
      .then(response => response.text())
      .then(data => {
        responseDiv.textContent = data;
      })
      .catch(error => {
        responseDiv.textContent = 'Error: ' + error;
      });
  });
});