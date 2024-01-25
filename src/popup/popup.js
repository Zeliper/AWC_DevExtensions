/**
 * HTML Builder
 */
function buildHtml(html){
    const temp = document.createElement('template');
    temp.innerHTML = html.trim();
    const res = temp.content.firstChild;
    
    if(res.length === 1) 
        return res[0];

    return res;
}

/**
 * Build Navigation Bar
*/
function InitializeNavigationBar() {
    let selectTab = function(e) {
        //Reset Tab Button
        document.querySelectorAll(`.nav-link`).forEach(x=>{
            x.classList.remove("active");
        });
        e.target.classList.add("active");

        //Set Tab Panel
        document.querySelectorAll(`.tab-pane`).forEach(x=>{
            x.classList.remove("show");
            x.classList.remove("active");
        });
        let currentTab = document.querySelector(`.tab-pane[aria-labelledby='${e.target.getAttribute("aria-controls")}-tab']`);
        currentTab.classList.add("show");
        currentTab.classList.add("active");

        chrome.storage.sync.set({"awcDevtools_setting_tab":{
            lastSelectedTab : parseInt(currentTab.getAttribute("tabindex"))
        }});
    }

    for(let nav of document.querySelectorAll(`.nav-link`)){
        nav.addEventListener("click", selectTab)
    }

    //Load Settings
    chrome.storage.sync.get("awcDevtools_setting_tab",function(res) {
        let tabSetting = res["awcDevtools_setting_tab"]
        if(tabSetting?.lastSelectedTab){
            let lastTab = document.querySelector(`.tab-pane[tabindex='${tabSetting.lastSelectedTab}']`)
            let lastButton = document.querySelector(`.nav-link#${lastTab.id}-tab`);
            selectTab({target : lastButton});
        }
    });
}

/**
 * Build Accordian
 */
function InitializeAccordian() {
    function updateSettings(accordianId, value){
        chrome.storage.sync.get("awcDevtools_setting_accordian",function(res) {
            let accordianSettings = res["awcDevtools_setting_accordian"] ? res["awcDevtools_setting_accordian"] : {}
            let additionalSetting = {}
            additionalSetting[accordianId] = value;
            chrome.storage.sync.set({"awcDevtools_setting_accordian": Object.assign(accordianSettings, additionalSetting)});
        });
    }
    function clickAccordian(e) {
        let accordianId = e.target.getAttribute("data-bs-target");
        let accordianPane = document.querySelector(accordianId);
        if(e.target.classList.contains("collapsed")){
            //Expand 기능
            e.target.classList.remove("collapsed");
            accordianPane.classList.add("show");
            updateSettings(accordianId,true);
        }else{
            //Collapse 기능
            e.target.classList.add("collapsed");
            accordianPane.classList.remove("show");
            updateSettings(accordianId,false);
        }
    }
    for(let accordianBtn of document.querySelectorAll(`.accordion-button`)){
        accordianBtn.addEventListener("click", clickAccordian);
    }

    //Load Settings
    chrome.storage.sync.get("awcDevtools_setting_accordian",function(res) {
        let accordianSettings = res["awcDevtools_setting_accordian"]

        if(!accordianSettings) //ERR Handling
            return;

        for(let accId of Object.keys(accordianSettings)){
            let acc = document.querySelector(accId);
            let accBtn = document.querySelector(`button[data-bs-target='${accId}']`);
            if(acc && accBtn){
                if(accordianSettings[accId]){
                    //펼치기
                    accBtn.classList.remove("collapsed");
                    acc.classList.add("show");
                }else{
                    //접기
                    accBtn.classList.add("collapsed");
                    acc.classList.remove("show");
                }
            }
        }
    });
}

/**
 * Module Initialize
 */

const umType = {
    add : 0,
    remove : 1,
    update : 3
}
async function InitializeModuleList() {
    let targetTbody = document.querySelector(`.tbody-modules`);
    async function getModuleSettings() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(["awcDevtools_ImportModules"], function(items){
                if(items["awcDevtools_ImportModules"]){
                    resolve(items["awcDevtools_ImportModules"])
                }else{
                    resolve(null);
                }
            });
        });
    }

    //Update Module Info
    async function updateModuleInfo(type, mPath, mName, enableState){
        switch(type){
            case umType.add:
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id,{code: "addModule", data :{
                        path : mPath,
                        name : mName,
                        enabled : enableState
                    }});
                });
                break;
            case umType.remove:
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id,{code: "removeModule", data :{
                        path : mPath,
                        name : mName,
                        enabled : enableState
                    }});
                });
                break;
            case umType.update:
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id,{code: "updateModuleState", data :{
                        path : mPath,
                        name : mName,
                        enabled : enableState
                    }});
                });
                break;
        }
    }

    function buildTd(mPath,mName,enableState,isNew){
        let tableData = buildHtml(`<tr is-new="${isNew}">
        <td scope="row">
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" role="switch" id="moduleEnable">
                <label id="modulePath">${mPath}</label>
                <input id="modulePathInput"></input>
            </div>
        </td>
        <td>
            <label id="moduleName">${mName}</label>
            <input id="moduleNameInput"></input>
        </td>
        <td id="tbody-gap"></td>
        <td id="tbody-button"><img id="btnEdit" class="hide-element" type="button" src="./icons/pencil-square.svg"/><img id="saveBtn" type="button" src="./icons/floppy.svg"/><img id="rmBtn" type="button" src="./icons/dash-square.svg"/></td>
        </tr>`);
        if(tableData){
            //Enable Disable 동작
            let checkBox = tableData.querySelector(`#moduleEnable`)
            checkBox.checked = enableState;
            checkBox.addEventListener("change", (e) => {
                if(mPath !== tableData.querySelector(`#modulePath`).textContent){
                    mPath = tableData.querySelector(`#modulePath`).textContent;
                }
                if(mName !== tableData.querySelector(`#moduleName`).textContent){
                    mName = tableData.querySelector(`#moduleName`).textContent;
                }
                updateModuleInfo(umType.update, mPath,mName,tableData.querySelector(`#moduleEnable`).checked);
            });

            function changeShowState(elem, isShow){
                if(isShow){
                    elem.classList.remove("hide-element");
                }else{
                    elem.classList.add("hide-element");
                }
            }

            function setInputState(state) {
                //입력 Component 설정
                for(let comp of tableData.querySelectorAll(`#modulePathInput, #moduleNameInput, #saveBtn`)){
                    changeShowState(comp,state)
                }

                //모듈 Component 설정
                for(let comp of tableData.querySelectorAll(`#moduleEnable, #modulePath, #moduleName, #btnEdit`)){
                    changeShowState(comp,!state)
                }
            }
            
            // Remove Button 동작
            let rmButton = tableData.querySelector(`#rmBtn`);
            rmButton.addEventListener("click", (e)=>{
                let tr = e.target.parentElement.parentElement;
                if(tr.getAttribute("is-new") == "true"){
                    tr.parentElement.removeChild(tr);
                }else{
                    tr.parentElement.removeChild(tr);
                    updateModuleInfo(umType.remove, tableData.querySelector(`#modulePath`).textContent,tableData.querySelector(`#moduleName`).textContent,false);
                }
                //TODO : 지우고 저장하는거 추가 해야함.
            });

            // Save Button 동작
            let saveButton = tableData.querySelector(`#saveBtn`);
            saveButton.addEventListener("click", (e)=> {
                let isPathChanged = tableData.querySelector(`#modulePath`).textContent !== tableData.querySelector(`#modulePathInput`).value;
                let isNameChanged = tableData.querySelector(`#moduleName`).textContent !== tableData.querySelector(`#moduleNameInput`).value;
                
                let orgPath = tableData.querySelector(`#modulePath`).textContent;
                let orgName = tableData.querySelector(`#moduleName`).textContent;
                tableData.querySelector(`#modulePath`).textContent = tableData.querySelector(`#modulePathInput`).value;
                tableData.querySelector(`#moduleName`).textContent = tableData.querySelector(`#moduleNameInput`).value;

                if(tableData.getAttribute("is-new") != "true"){
                    if(isPathChanged){
                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                            chrome.tabs.sendMessage(tabs[0].id,{code: "changePath", data :{
                                orgData : orgPath,
                                path : tableData.querySelector(`#modulePath`).textContent,
                                name : mName,
                                enabled : tableData.querySelector(`#moduleEnable`).checked
                            }});
                        });
                    }
                    if(isNameChanged){
                        alert("Name Changed");
                    }
                }else{
                    updateModuleInfo(umType.add, tableData.querySelector(`#modulePath`).textContent,tableData.querySelector(`#moduleName`).textContent,tableData.querySelector(`#moduleEnable`).checked);
                }

                tableData.setAttribute("is-new", "false")
                setInputState(false);
            });

            // Edit Button 동작
            tableData.querySelector(`#btnEdit`).addEventListener("click", (e)=> {
                tableData.querySelector(`#modulePathInput`).value = tableData.querySelector(`#modulePath`).textContent;
                tableData.querySelector(`#moduleNameInput`).value = tableData.querySelector(`#moduleName`).textContent;
                
                setInputState(true);
            });

            setInputState(isNew);
            //Table에 추가.
            targetTbody.appendChild(tableData);
        }
    }

    //Add Module Button
    document.querySelector(`#table-plus-button`).addEventListener("click", (e)=>{
        buildTd("","",false,true)
        return;
    });

    //Load Settings    
    let moduleSetting = await getModuleSettings();
    if(moduleSetting){
        for(let v of moduleSetting){
            buildTd(v[1],v[0],v[2], false);
        }
    }
}

/**
 * Initialize Hotkey
 */
async function InitializeHotkey() {
    let hotkeyTable = document.querySelector(".tbody-hotkeys");

    function buildHotkeyTable (func, hotkey,enabled) {
        let tableData = buildHtml(`
            <tr>
            <td scope="row">
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" role="switch" id="hotkeyEnable">
                    <label id="hotKeyFunc">${func}</label>
                </div>
            </td>
            <td>
                <label id="hotkey">${hotkey}</label>
            </td>
            </tr>`);
        if(tableData){
            hotkeyTable.appendChild(tableData);
        }
    }

    buildHotkeyTable("Property 표시 로테이션", "F8", false)
    //Load Settings    
    // let moduleSetting = await getModuleSettings();
    // if(moduleSetting){
    //     for(let v of moduleSetting){
    //         buildTd(v[1],v[0],v[2], false);
    //     }
    // }
}

/**
 * Initializer For Popup
 */
document.addEventListener('DOMContentLoaded', function(){
    InitializeNavigationBar();
    InitializeAccordian();
    InitializeModuleList();
    InitializeHotkey();

    // Button Test
    var button1 = document.getElementById("button1");
    button1.addEventListener("click", function() {
        chrome.storage.sync.clear();
    })
});