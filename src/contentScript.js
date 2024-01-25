( function(){
    let isSWFApp = false;
    let done = false;
    let noOfAttempts = 0;
    let MAX_ATTEMPTS = 100;
    const observer = new MutationObserver( mutationRecords => {
        for( let mutation of mutationRecords ) {
            if( mutation.type === 'attributes' ) {
                noOfAttempts++;
                try {
                    let target = mutationRecords[ 0 ].target;
                    let hasMainView = target.querySelectorAll('.aw-layout-mainView');
                    if( hasMainView && hasMainView.length > 0 ) {
                        isSWFApp = true;
                        observer.disconnect();
                    }
                }catch(e){

                }
            }
        }
        if( noOfAttempts >= MAX_ATTEMPTS ){
            observer && observer.disconnect();
        }
        if( isSWFApp ) {
            let injectExternalScript = () => {
                let injectScript = ( file_path, tag ) => {
                    var node = document.getElementsByTagName( tag )[ 0 ];
                    var script = document.createElement( 'script' );
                    script.setAttribute( 'type', 'text/javascript' );
                    script.setAttribute( 'src', file_path );
                    node.appendChild( script );
                }
                injectScript( chrome.runtime.getURL( '/src/injector.js' ), 'body' );
                // (async()=>{
                //     const src = chrome.runtime.getURL('/src/injector.js');
                //     const contentScript = await import(src);
                //     contentScript.main();
                //     console.log("Loa1d!");
                // })();
            }
            //content-script.js
            window.addEventListener( 'message', function( event ) {
                // Only accept messages from the same frame
                if( event.source === window && !done ) {
                    chrome.runtime.sendMessage( { isSWFApp: true } );
                    done = true;
                    return;
                }
                var message = event.data;
                // Only accept messages that we know are ours
                if( typeof message !== 'object' || message === null ) {
                    return;
                }
                if(chrome?.runtime){
                    try{
                        chrome.runtime.sendMessage( message );
                    }catch(e){
                        console.log(e);
                    }
                    
                }
            } );
            window.addEventListener( 'message', function( event ) {
                var message = event.data;
                if( typeof message !== 'object' || message === null ) {
                    return;
                }
                // 설정값 저장, 불러오기
                if(message.code == "getStorage.Start"){
                    // chrome.storage.sync.set({ "yourBody": "myBody" }, function(){
                    //     //  A data saved callback omg so fancy
                    // });
                    
                    chrome.storage.sync.get(["awcDevtools_ImportModules"], function(items){
                        if(!items["awcDevtools_ImportModules"]){
                            let initialModules = [
                                ["ctx", "js/appCtxService", true],
                                ["soaService", "soa/kernel/soaService" ,true],
                                ["AwcObjectUtil", "js/AwcObjectUtil", true],
                                ["appCtxService", "js/appCtxService", true],
                                ["addObjectUtils", "js/addObjectUtils", true],
                                ["eventBus", "js/eventBus", true],
                                ["commandPanelService", "js/commandPanel.service", true]
                            ]
                            chrome.storage.sync.set({ "awcDevtools_ImportModules":  initialModules}, function(){});
                            window.postMessage({code: "getStorage.Done", data : initialModules}, window.location.origin);
                        }else{
                            window.postMessage({code: "getStorage.Done", data : items["awcDevtools_ImportModules"]}, window.location.origin);
                        }
                    });
                }
            } );
            
            injectExternalScript();
        }
    } );
    const config = { attributes: true, childList: true, subtree: true };
    observer.observe( document.body, config );
})();

chrome.runtime.onMessage.addListener((r,s,res)=> {
    if(r.code){
        window.postMessage({code: r.code, data : r.data}, window.location.origin);

        //Update Module Setting
        chrome.storage.sync.get("awcDevtools_ImportModules",function(res) {
            let moduleSettings = res["awcDevtools_ImportModules"] ? res["awcDevtools_ImportModules"] : []
            if(r.code == "addModule"){
                if(moduleSettings.filter(x=>x[0] == r.data.name).length > 0){
                    //혹시 모를 업데이트
                    for(let setting of moduleSettings.filter(x=>x[0] == r.data.name)){
                        setting[2] = r.data.enabled;
                    }
                }else{
                    // 추가 로직
                    moduleSettings.push([r.data.name, r.data.path, false]);
                    chrome.storage.sync.set({"awcDevtools_ImportModules": moduleSettings});
                }
            }else if(r.code == "removeModule"){
                chrome.storage.sync.set({"awcDevtools_ImportModules": moduleSettings.filter(x=>{
                    return x[0] != r.data.name && x[1] != r.data.path
                })});
            }else{
                for(let setting of moduleSettings.filter(x=>x[0] == r.data.name)){
                    setting[2] = r.data.enabled;
                }
                chrome.storage.sync.set({"awcDevtools_ImportModules": moduleSettings});
            }
        });
    }
});