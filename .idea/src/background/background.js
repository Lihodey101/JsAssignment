// Stores tab IDs that have been refreshed
let refreshedTabs = new Set();
const isExtensionEnabledStr = 'isExtensionEnabled';
const reloadedTabsStr = 'reloadedTabs';
const replaceStr = 'replace';
const restoreStr = 'restore';

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
});


// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(`Received message from popup script: ${request.command}`);
    const validCommands = ['start', 'stop'];

    if (validCommands.includes(request.command)) {
        const isExtensionEnabled = request.command === 'start';
        const action = isExtensionEnabled ? replaceStr : restoreStr;
        // Set the extension state based on the command
        chrome.storage.local.set({isExtensionEnabled}, () => {
            console.log(`${request.command} command is sent. Setting isExtensionEnabled to ${isExtensionEnabled}.`);
            // Ensure extension state was updated
            chrome.storage.local.get([isExtensionEnabledStr], (result) => {
                console.log(`isExtensionEnabled is set to: ${result.isExtensionEnabled}`);
            });
        });
        sendMessageToContentScript(action);
    }
});

// Listener to check if tab is activated
chrome.tabs.onActivated.addListener(activeInfo => {
    // Fetch the state of reloaded tabs and extension state (if plugin was activated with a 'restore' button)
    chrome.storage.local.get([reloadedTabsStr, isExtensionEnabledStr], (result) => {
        const reloadedTabs = result.reloadedTabs || {};
        const isExtensionEnabled = result.isExtensionEnabled;

        // Check if the tab needs to be reloaded
        if (!reloadedTabs[activeInfo.tabId]) {
            // If the tab has not been reloaded yet, reload it and mark as reloaded
            chrome.tabs.reload(activeInfo.tabId, {}, () => {
                reloadedTabs[activeInfo.tabId] = true;
                chrome.storage.local.set({reloadedTabs: reloadedTabs});
            });
        }

        // Decide on the action based on the extension's enabled state
        if (isExtensionEnabled) {
            sendMessageToContentScript(replaceStr);
        } else if (reloadedTabs[activeInfo.tabId] && !isExtensionEnabled) {
            sendMessageToContentScript(restoreStr);
        }
    });
});

// Listens to tab update
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Send message only if tab update status is 'complete' and tab  active
    if (changeInfo.status === 'complete' && tab.active) {
        chrome.storage.local.get([isExtensionEnabledStr], (result) => {
            const action = result.isExtensionEnabled ? replaceStr: restoreStr;
            sendMessageToContentScript(action);
        });
    }
});

// Listens if tab is closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.storage.local.get([reloadedTabsStr], (result) => {
        const reloadedTabs = result.reloadedTabs || {};
        // Check if closed tab was added into reloadedTabs
        if (reloadedTabs.hasOwnProperty(tabId)) {
            // If yes, delete it
            delete reloadedTabs[tabId];
            // Update reloadedTabs
            chrome.storage.local.set({reloadedTabs});
        }
    });
});


// Function to send command to content script with retry logic
function sendMessageToContentScript(message) {
    console.log("Sending message to content script:", message);
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs.length > 0) {
            sendMessageToTab(tabs[0].id, {action: message, tabId: tabs[0].id}, 3);
        } else {
            console.error("No active tab");
        }
    });
}

function sendMessageToTab(tabId, message, retries) {
    console.log(`Sending message to tab ${tabId}:`, message);

     chrome.tabs.get(tabId, (tab) => {
           // Check if there was an error fetching the tab details
           if (chrome.runtime.lastError) {
               console.error("Error fetching tab:", chrome.runtime.lastError.message);
               return;
           }

           // Check if the tab is loaded
           if (tab.status === "complete") {
                chrome.tabs.sendMessage(tabId, message, (response) => {
                    // Check for errors after trying to send a message
                    if (chrome.runtime.lastError) {
                       console.error("Error sending message:", chrome.runtime.lastError.message);
                    } else {
                       console.log("Message sent successfully. Response:", response);
                    }
                });
           } else if (retries > 0) {
               console.log("Tab not ready, trying again. Remaining retries:", retries);
               setTimeout(() => sendMessageToTab(tabId, message, retries - 1), 200);
           } else {
               // Log failure after exhausting retries
               console.log("Failed to send message after retries. Tab status:", tab.status);
           }
     });
}

