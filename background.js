chrome.action.onClicked.addListener(function (tab) {
    let baseUrl = "https://savmrl.it/";
    let parameterUrl = "?link=";
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        var currentTab = tabs[0];
        var currentTabUrl = currentTab.url;

        var newUrl = baseUrl + parameterUrl + encodeURIComponent(currentTabUrl);

        chrome.tabs.create({url: newUrl});
    });
});
