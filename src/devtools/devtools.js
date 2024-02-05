chrome.devtools.inspectedWindow.eval( "window.isSWFApp",
    function(isSWFApp){
        if(isSWFApp){
            chrome.devtools.panels.create("AWC Debugger", "image/icon.png", "src/devtools/panel/panel.html", function(panel) {});
            chrome.devtools.panels.elements.createSidebarPane("AWC Inspector", 
            function(sidebar) {
                function getComponent(){
                    function getPanelContexts(){
                        return {
                            selectedNode : $0,
                            reactFiber : window.retrive($0)
                        }
                    }
                    sidebar.setExpression(
                        "(" + getPanelContexts.toString() + ")()"
                    );
                }
                // chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
                //     sidebar.setExpression(`
                //         window.retrive($0)
                //     `, "TTTT");
                //     sidebar.setExpression(`
                //         $0
                //     `, "Sel");
                // });
                getComponent();
                chrome.devtools.panels.elements.onSelectionChanged.addListener(getComponent);
                // sidebar.setExpression(`$0`, "TTTT");
                // sidebar.setPage("src/devtools/panel/sidebar.html");
            });
        }
    }
);