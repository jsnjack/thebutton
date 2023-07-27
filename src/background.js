const surflyServer = "surfly.online";

// Firefox and Chrome have different API for actions/pageActions
var action = typeof browser !== 'undefined' ? chrome.pageAction : chrome.action;
var show = typeof browser !== 'undefined' ? action.show : action.enable;
var hide = typeof browser !== 'undefined' ? action.hide : action.disable;

function showActionButton(tabID) {
    show(tabID);
}

function hideActionButton(tabID) {
    hide(tabID);
}

// No need to show the action on surfly server pages or invalid urls
// Note: this fully works on firefox only, as Chrome always shows the button and
// just disables the action
function isSurflableURL(url) {
    try {
        const newURL = new URL(url);
        if (newURL.hostname === surflyServer || newURL.hostname.endsWith(surflyServer)) {
            return false;
        }
        return true;
    } catch (error) {
        return false;
    }
}

// Start a new Surfly session by navigating to the dashboard with url in query string
function startSurflySession(url) {
    const newURL = new URL("https://app." + surflyServer);
    newURL.searchParams.set("url", url);
    chrome.tabs.update({ url: newURL.toString() });
}

// Show or deactivate the action button on page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.status !== "complete") {
        return;
    }
    // If it is a Surfly session or invalid url - hide the action button
    if (isSurflableURL(tab.url)) {
        showActionButton(tabId);
    } else {
        hideActionButton(tabId);
    }
});

// Get the ID of the tab which runs Surfly session
async function getSurflyTabID() {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        url: [
            `https://${surflyServer}/*`,  // Regular Surfly session or Space
            `https://*.${surflyServer}/*`,  // Space session with custom subdomain
        ]
    });

    for (const tab of tabs) {
        let injectionResults = await chrome.scripting.executeScript({
            target: {
                tabId: tab.id,
            },
            // Browser doesn't allow us to check for window.SESSION_ID directly,
            // so we use a side effect of initializing the Surfly fronted app
            func: () => {
                return document.querySelector("#globals")?.textContent.includes("SESSION_ID");
            }
        });
        if (injectionResults[0].result) {
            return tab.id;
        }
    }
}

// Handle button click with 2 possible outcomes:
// 1. Start a new Surfly session in the current window if no tab is running a Surfly session
// 2. Open current tab URL inside of running Surfly session as a new tab
action.onClicked.addListener(async (tab) => {
    let surflySessionTabID = await getSurflyTabID();
    if (surflySessionTabID === undefined) {
        startSurflySession(tab.url);
        return;
    } else {
        // Activate the tab with Surfly session
        chrome.tabs.update(
            surflySessionTabID,
            {
                active: true,
            }
        );

        // Open current tab URL inside of running Surfly session
        await chrome.scripting.executeScript({
            target: {
                tabId: surflySessionTabID,
            },
            func: (url) => {
                window.postMessage({
                    type: 'api_request',
                    params: {
                        cmd: 'open_tab',
                        url: url
                    }
                }, "*");
            },
            args: [tab.url]
        });
    }
});
