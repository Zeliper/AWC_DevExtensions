let loadModules = async (moduleList) => {
      for (let i of moduleList) {
        let module = await new Promise((resolve, reject) => {
            try{
                window.afxDynamicImport([i[1]], (e) => {
                    resolve(e);
                });
            }catch(e){
                resolve(null);
            }
        });
        
        if(module){
            switch (i[0]) {
                case "ctx":
                    if(i[2]){
                        if(module.getCtx()){
                            Object.defineProperty(window,i[0], {get: ()=>module.getCtx()});
                        }else{
                            window[i[0]] = module.ctx;
                        }
                    }
                    break;
                default:
                    if(i[2])
                        window[i[0]] = module;
                    break;
            }
        }
        return module;
    }
}

window.addEventListener("message",
    async (event) => {
        var message = event.data;
        // Only accept messages that we know are ours
        if( typeof message !== 'object' || message === null ) {
            return;
        }
        if(message.code == "getStorage.Done"){
            let maxTryCount = 120
            let importChecker = setInterval(()=> {
                if(window.afxDynamicImport){
                    loadModules(message.data);
                    clearInterval(importChecker);
                }else{
                    console.log(maxTryCount);
                    if(maxTryCount-- == 0){
                        clearInterval(importChecker);
                    }
                }
            }, 500);
        }
        if(message.code == "updateModuleState"){
            if(message.data.enabled){
                loadModules([[message.data.name, message.data.path, true]])
            }else{
                delete window[message.data.name]
            }
        }
        
        if(message.code == "addModule"){
            loadModules([[message.data.name, message.data.path, false]])
        }

        if(message.code == "removeModule"){
            if(window[message.data.name]){
                delete window[message.data.name]
            }
        }

        if(message.code == "changePath"){
            loadModules([[message.data.name, message.data.path, message.data.enabled]]);
        }

        if(message.code == "changeName"){
            if(window[message.data.name]){
                delete window[message.data.name]
            }
        }
    },
    false,
);

window.postMessage({code: "getStorage.Start"}, window.location.origin);


function viewProperty(){
    if(document.querySelector(`.ng-scope`)){
        // ~ 6.1 Angular
    }else{
        // 6.3 ~ React

        //Property Setting 
        document.querySelectorAll(`.sw-property`).forEach(e=>e.style.background = "grey");

        //Observer For Additional Properties
    }
}

hotkeyTable = {
    "F8" : viewProperty
}

function doc_keyUp(e) {
    // this would test for whichever key is 40 (down arrow) and the ctrl key at the same time
    if(hotkeyTable[e.code]){
        hotkeyTable[e.code]();
    }
}

document.addEventListener('keyup', doc_keyUp, false);