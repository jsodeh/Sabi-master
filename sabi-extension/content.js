console.log("Sabi content script loaded.");

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const action = {
    type: 'click',
    target: {
      tagName: target.tagName,
      id: target.id,
      className: target.className,
      textContent: target.textContent?.slice(0, 50) // Limit text content length
    },
    timestamp: new Date().toISOString()
  };

  console.log('Action recorded:', action);

  fetch('http://localhost:3001/actions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(action)
  }).catch(error => console.error('Error sending action to backend:', error));
});