document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('start');
  const stopButton = document.getElementById('stop');

  startButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({command: 'start'});
  });

  stopButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({command: 'stop'});
  });
});