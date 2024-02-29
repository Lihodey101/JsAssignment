let originalHTML = '';

function replaceLetters() {
  if (!originalHTML) originalHTML = document.body.innerHTML;
  const randomNum = () => Math.floor(Math.random() * 10);
  document.body.innerHTML = document.body.innerHTML.replace(/а/g, randomNum);
}

function restoreOriginal() {
 if(!originalHTML) return;
 document.body.innerHTML = originalHTML;
 originalHTML = '';
}

// Слушаем сообщения от фонового скрипта
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "replace") {
      console.log("Replacing letters");
      replaceLetters(request.tabId);
    } else if (request.action === "restore") {
     console.log("Restoring letters");
     restoreOriginal(request.tabId);
    }
    sendResponse({result: "done"});
});

