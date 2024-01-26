function getReactFiberProps (elem) {
    let fiberKey = Object.keys(elem).filter(e=>e.indexOf('__reactFiber') > -1)[0];
    return elem[fiberKey].return.memoizedProps;
}

function buildHtml(html){
    const temp = document.createElement('template');
    temp.innerHTML = html.trim();
    const res = temp.content.firstChild;
    
    if(res.length === 1) 
        return res[0];

    return res;
}

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
                            Object.defineProperty(window,i[0], {get: ()=>module.getCtx(), configurable: true});
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

const config = { attributes: true, childList: true, subtree: true, attributeOldValue: true };

let observer;
let tableObserver;

function viewProperty(initial = 0){
    let stage = sessionStorage.getItem('stage')
    stage = stage ? stage : 0;
    stage++;
    sessionStorage.setItem('stage',  stage > 2 ? 0 : stage);

    if(document.querySelector(`.ng-scope`)){
        // ~ 6.1 Angular
        alert(`Let's to ${stage}`);
    }else{
        // 6.3 ~ React
        switch(stage){
            case 1: // Display , Property 혼용 표기
            {
                if(observer) observer.disconnect();
                document.querySelectorAll(`.aw-devtool-props`).forEach(e => {
                    e.remove();
                });

                //Header Property
                function setHeaderProperty(elem){
                    let elemData = getReactFiberProps(elem);
                    if(!elemData?.value || !elemData?.name) return;
                    elem.insertBefore(buildHtml(`
                        <div class="aw-devtool-props" style="position: fixed;margin-top: 30px;margin-left: 2px;">
                            <span style="display: flex;width: 50%;line-height: 12px;">${elemData.name}: ${elemData.value}</span>
                        </div>
                    `), elem.children[1]);
                }

                //WorkareaProperty
                function setWorkareaProperty(elem){
                    let elemData = getReactFiberProps(elem);
                    if(!elemData?.label || !elemData?.name || !elemData?.vmo?.props) return;
                    elem.appendChild(buildHtml(`
                        <span class="sw-property-name aw-devtool-props">${elemData.label} <span class="dev-tool-grey">[${elemData.name}]</span></span>
                    `));
                    elem.appendChild(buildHtml(`
                        <span class="sw-property-val aw-devtool-props">${elemData.vmo.props[elemData.name].displayValues.join(', ')} <span class="dev-tool-grey">[${elemData.value}]</span></span>
                    `));
                    
                    elem.querySelectorAll(`:is(.sw-property-name, .sw-property-val):not(:is(.aw-devtool-props, .aw-devtool-org-props))`).forEach(orgElem=>{
                        orgElem.classList.add("aw-devtool-org-props");
                        orgElem.classList.add("aw-dev-hide");
                    });
                }

                //FirstToggle!
                document.querySelectorAll(`.aw-layout-headerPropContainer .sw-property`).forEach(e => {
                    setHeaderProperty(e);
                });
                document.querySelectorAll(`.aw-layout-workarea .sw-property`).forEach(e=>{
                    setWorkareaProperty(e);
                })

                // Observer Toggle
                observer = new MutationObserver((muList, obs) => {
                    //Header Reload
                    document.querySelectorAll(`.aw-layout-headerProperties .sw-property:not(:has(.aw-devtool-props))`).forEach(elem => {
                        setHeaderProperty(elem);
                    });
                    document.querySelectorAll(`.aw-layout-workarea .sw-property:not(:has(.aw-devtool-props))`).forEach(e=>{
                        setWorkareaProperty(e);
                    })
                });
                observer.observe(document.body, config);
                break;
            }
            case 2: // Property 단일 표기
            {
                if(observer) observer.disconnect();
                document.querySelectorAll(`.aw-devtool-props`).forEach(e => {
                    e.remove();
                });
                
                //Header Property
                function setHeaderProperty(elem){
                    let elemData = getReactFiberProps(elem);
                    if(!elemData?.value || !elemData?.name) return;
                    elem.appendChild(buildHtml(`
                        <span class="sw-property-name aw-devtool-props">${elemData.name}</span>
                    `));
                    elem.appendChild(buildHtml(`
                        <span class="sw-property-val aw-devtool-props">${elemData.value}</span>
                    `));
                    
                    elem.querySelectorAll(`:is(.sw-property-name, .sw-property-val):not(:is(.aw-devtool-props, .aw-devtool-org-props))`).forEach(orgElem=>{
                        orgElem.classList.add("aw-devtool-org-props");
                        orgElem.classList.add("aw-dev-hide");
                    });
                }

                
                //WorkareaProperty
                function setWorkareaProperty(elem){
                    let elemData = getReactFiberProps(elem);
                    if(!elemData?.label || !elemData?.name || !elemData?.vmo?.props) return;
                    elem.appendChild(buildHtml(`
                        <span class="sw-property-name aw-devtool-props">${elemData.name}</span>
                    `));
                    elem.appendChild(buildHtml(`
                        <span class="sw-property-val aw-devtool-props">${elemData.value}</span>
                    `));
                    
                    elem.querySelectorAll(`:is(.sw-property-name, .sw-property-val):not(:is(.aw-devtool-props, .aw-devtool-org-props))`).forEach(orgElem=>{
                        orgElem.classList.add("aw-devtool-org-props");
                        orgElem.classList.add("aw-dev-hide");
                    });
                }

                document.querySelectorAll(`.aw-layout-headerPropContainer .sw-property`).forEach(e => {
                    setHeaderProperty(e);
                });
                document.querySelectorAll(`.aw-layout-workarea .sw-property`).forEach(e=>{
                    setWorkareaProperty(e);
                })

                
                // if(!elemData?.label || !elemData?.name || !elemData?.vmo?.props) return;

                // Observer Toggle
                observer = new MutationObserver((muList, obs) => {
                    //Header Reload
                    document.querySelectorAll(`.aw-layout-headerProperties .sw-property:not(:has(:is(.aw-devtool-props, .aw-devtool-org-props)))`).forEach(elem => {
                        setHeaderProperty(elem);
                    });
                    document.querySelectorAll(`.aw-layout-workarea .sw-property:not(:has(:is(.aw-devtool-props, .aw-devtool-org-props)))`).forEach(e=>{
                        setWorkareaProperty(e);
                    })
                });
                observer.observe(document.body, config);
                break;
            }
            case 3: //기본값
            {
                if(observer) observer.disconnect();
                document.querySelectorAll(`.aw-devtool-props`).forEach(e => {
                    e.remove();
                });
                document.querySelectorAll(`.aw-devtool-org-props`).forEach(e=>{
                    e.classList.remove("aw-devtool-org-props");
                    e.classList.remove("aw-dev-hide");
                });
                break;
            }
        }
        //Table Information
        if(stage < 3){
            if(tableObserver) tableObserver.disconnect();
            //tableBuilder
            function setTableInfo(elem){
                let objsetData = getReactFiberProps(elem)?.objsetdata;
                if(!objsetData?.source) return;
                elem.appendChild(buildHtml(`
                    <span class="aw-devtool-tableprops">${objsetData.source}</span>
                `));

                elem.classList.add("aw-already-shown");
            }

            //Initial Setup
            document.querySelectorAll(`.aw-walker-objectset:not(.aw-already-shown)`).forEach(e=>{
                setTableInfo(e)
            });

            //Observer
            tableObserver = new MutationObserver((muList, obs) => {
                document.querySelectorAll(`.aw-walker-objectset:not(.aw-already-shown)`).forEach(e=>{
                    setTableInfo(e)
                });
            });
            tableObserver.observe(document.body, config);
        }else{
            if(tableObserver) tableObserver.disconnect();
            document.querySelectorAll(`.aw-devtool-tableprops`).forEach(e => {
                e.remove();
            });
            document.querySelectorAll(`.aw-already-shown`).forEach(e => {
                e.classList.remove("aw-already-shown");
            });
        }
    }
}

function doc_keyUp(e) {
    if(e.key == "q" && e.altKey){
        viewProperty();
    }
}

document.addEventListener('keyup', doc_keyUp, false);

//Initialize Session Variable
sessionStorage.setItem('stage', 0);