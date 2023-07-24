const surflyServer = "surfly.online";
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    console.log("onUpdated", tabId, changeInfo, tab);
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

action.onClicked.addListener((tab) => {
    const newURL = new URL("https://app." + surflyServer);
    newURL.searchParams.set("url", tab.url);
    chrome.tabs.update({url: newURL.toString()});
});
