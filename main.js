let data = JSON.parse(localStorage.getItem("kaikei")) || [];
let subjects = JSON.parse(localStorage.getItem("subjects")) || [];
let startCash = Number(localStorage.getItem("startCash") || 0);
let startBank = Number(localStorage.getItem("startBank") || 0);
let editIndex = null;
let bulkEditMode = false;
let selectedRows = new Set();

function main() {
    loadData();

    // 読み込まれた時
    addEventListener("DOMContentLoaded", () => onLoad());
}

function onLoad() {
    if (localStorage.getItem("startCash") !== null)
        document.getElementById("carryArea").style.display = "none";

    updateSubjectSelect();
    setupTypeToggle();
    render();
}

function getSelectedRadioValue(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : "";
}

function setRadioValue(name, value) {
    const target = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (target) target.checked = true;
}

function setupTypeToggle() {
    document.querySelectorAll('input[name="type"]').forEach(r => {
        r.addEventListener("change", updateAccountVisibility);
    });
    updateAccountVisibility();
}

function updateAccountVisibility() {
    const typeVal = getSelectedRadioValue("type");
    const accountGroup = document.getElementById("accountGroup");
    const transferGroup = document.getElementById("transferGroup");
    if (typeVal === "振替") {
        accountGroup.style.display = "none";
        transferGroup.style.display = "flex";
    } else {
        accountGroup.style.display = "flex";
        transferGroup.style.display = "none";
    }
}

function setStart(){
    startCash = Number(document.getElementById("startCash").value);
    startBank = Number(document.getElementById("startBank").value);
    localStorage.setItem("startCash", startCash);
    localStorage.setItem("startBank", startBank);
    document.getElementById("carryArea").style.display = "none";
    render();
}

function save(){
    const sub = document.getElementById("subject").value;
    const typeVal = getSelectedRadioValue("type") || "収入";

    let accountVal = getSelectedRadioValue("account") || "現金";
    if (typeVal === "振替") {
        const dir = getSelectedRadioValue("transferDirection") || "deposit";
        accountVal = dir === "withdraw" ? "通帳" : "現金";
    }

    if (sub && !subjects.includes(sub)) {
        subjects.push(sub);
        localStorage.setItem("subjects", JSON.stringify(subjects)); 
        updateSubjectSelect();
    }
    
    const entry = {
        date: document.getElementById("date").value,
        type: typeVal,
        subject: sub,
        content: document.getElementById("content").value,
        amount: Number(document.getElementById("amount").value),
        account: accountVal,
        note: document.getElementById("note").value
    };

    if (editIndex !== null) {
        data[editIndex] = entry;
    } else {
        data.push(entry);
    }

    data.sort((a,b)=>a.date.localeCompare(b.date));

    const jsonData = JSON.stringify(data);
    localStorage.setItem("kaikei", jsonData);
    saveData();
    updateFilters();
    render();

    clearForm();
}

function clearForm(){
    document.getElementById("date").value = "";
    setRadioValue("type", "収入");
    setRadioValue("account", "現金");
    setRadioValue("transferDirection", "deposit");
    document.getElementById("subject").value = "";
    document.getElementById("content").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("note").value = "";
    editIndex = null;
    toggleEditUi(false);
    updateAccountVisibility();
}

function del(i){
    if (confirm("削除しますか？")){
        data.splice(i,1);
        const jsonData = JSON.stringify(data);
        localStorage.setItem("kaikei", jsonData);
        saveData();
        updateFilters();
        render();
    }
}

async function saveData() {
    const data = {
        kaikei: localStorage.getItem("kaikei"),
        subjects: localStorage.getItem("subjects"),
        startCash: localStorage.getItem("startCash"),
        startBank: localStorage.getItem("startBank"),
    }
    await fetch("https://kaikei.osu-gakkenpo.workers.dev/?pw=" + localStorage.getItem("password"), {
        method: "POST",
        body: JSON.stringify(data),
    });
}

async function loadData() {
    const jsonData = await fetch("https://kaikei.osu-gakkenpo.workers.dev/?pw=" + localStorage.getItem("password"), {
        method: "GET",
    });

    const data = JSON.parse(jsonData);

    localStorage.setItem("kaikei", data.kaikei);
    localStorage.setItem("subjects", data.subjects);
    localStorage.setItem("startCash", data.startCash);
    localStorage.setItem("startBank", data.startBank);
}

function startEdit(i){
    const d = data[i];
    editIndex = i;
    document.getElementById("date").value = d.date;
    setRadioValue("type", d.type);
    document.getElementById("subject").value = d.subject || "";
    document.getElementById("content").value = d.content;
    document.getElementById("amount").value = d.amount;
    if (d.type === "振替") {
        const dir = d.account === "通帳" ? "withdraw" : "deposit";
        setRadioValue("transferDirection", dir);
    } else {
        setRadioValue("account", d.account);
    }
    document.getElementById("note").value = d.note;
    updateAccountVisibility();
    toggleEditUi(true);
}

function cancelEdit(){
    clearForm();
}

function toggleEditUi(active){
    const indicator = document.getElementById("editIndicator");
    const cancelBtn = document.getElementById("cancelEditBtn");
    if (indicator) indicator.style.display = active ? "inline" : "none";
    if (cancelBtn) cancelBtn.style.display = active ? "inline-block" : "none";
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) saveBtn.textContent = active ? "更新" : "追加";
}

function toggleBulkEditMode(){
    bulkEditMode = !bulkEditMode;
    selectedRows.clear();
    const btn = document.getElementById("bulkEditBtn");
    if (btn) btn.textContent = bulkEditMode ? "総編集モード終了" : "総編集モード";
    const bulkActions = document.getElementById("bulkActions");
    if (bulkActions) bulkActions.style.display = bulkEditMode ? "block" : "none";
    render();
}

function toggleRowSelect(idx){
    if (selectedRows.has(idx)) {
        selectedRows.delete(idx);
    } else {
        selectedRows.add(idx);
    }
}

function selectAllRows(){
    const allCheckboxes = document.querySelectorAll('.row-checkbox');
    allCheckboxes.forEach(cb => {
        cb.checked = true;
        selectedRows.add(Number(cb.dataset.idx));
    });
}

function deselectAllRows(){
    selectedRows.clear();
    const allCheckboxes = document.querySelectorAll('.row-checkbox');
    allCheckboxes.forEach(cb => cb.checked = false);
}

function deleteSelected(){
    if (selectedRows.size === 0) {
        alert("削除する行を選択してください");
        return;
    }
    if (!confirm(`選択した${selectedRows.size}件を削除しますか？`)) return;
    const toDelete = Array.from(selectedRows).sort((a,b) => b - a);
    toDelete.forEach(idx => data.splice(idx, 1));
    localStorage.setItem("kaikei", JSON.stringify(data));
    saveData();
    updateFilters();
    selectedRows.clear();
    render();
}

function updateRow(idx){
    const typeVal = document.querySelector(`select[data-idx="${idx}"][data-field="type"]`).value;
    let accountVal = document.querySelector(`select[data-idx="${idx}"][data-field="account"]`).value;
    
    if (typeVal === "振替") {
        const dirVal = document.querySelector(`select[data-idx="${idx}"][data-field="transferDir"]`).value;
        accountVal = dirVal === "withdraw" ? "通帳" : "現金";
    }

    const updatedEntry = {
        date: document.querySelector(`input[data-idx="${idx}"][data-field="date"]`).value,
        type: typeVal,
        subject: document.querySelector(`select[data-idx="${idx}"][data-field="subject"]`).value,
        content: document.querySelector(`input[data-idx="${idx}"][data-field="content"]`).value,
        amount: Number(document.querySelector(`input[data-idx="${idx}"][data-field="amount"]`).value),
        account: accountVal,
        note: document.querySelector(`input[data-idx="${idx}"][data-field="note"]`).value
    };
    
    data[idx] = updatedEntry;
    data.sort((a,b)=>a.date.localeCompare(b.date));
    localStorage.setItem("kaikei", JSON.stringify(data));
    saveData();
    updateFilters();
    render();
}

function addSubject(){
    const newSub = prompt("新しい科目名を入力してください");
    if(newSub && !subjects.includes(newSub)){
        subjects.push(newSub);
        localStorage.setItem("subjects", JSON.stringify(subjects));
        updateSubjectSelect();
        alert("科目追加しました");
    }
}

function updateSubjectSelect(){
    const subSelect = document.getElementById("subject");
    subSelect.innerHTML="<option value=\"\">(なし)</option>";
    subjects.forEach(s=>{
        const opt = document.createElement("option");
        opt.value=s; opt.textContent=s;
        subSelect.appendChild(opt);
    });
    const subFilter = document.getElementById("subjectFilter");
    const val = subFilter.value;
    subFilter.innerHTML='<option value="">すべて</option>';
    subjects.forEach(s=>{
        const opt = document.createElement("option");
        opt.value=s; opt.textContent=s;
        subFilter.appendChild(opt);
    });
    subFilter.value = val;
}

function updateFilters(){
    const yearSet = new Set();
    const saved = JSON.parse(localStorage.getItem("kaikei")) || [];
    saved.forEach(d => yearSet.add(new Date(d.date).getFullYear()));
    const yearSelect = document.getElementById("yearFilter");
    const subjectSelect = document.getElementById("subjectFilter");
    const valYear = yearSelect.value;
    const valSub = subjectSelect.value;
    yearSelect.innerHTML='<option value="">すべて</option>';
    yearSet.forEach(y=>{
        const opt = document.createElement("option"); opt.value=y; opt.textContent=y+'年度';
        yearSelect.appendChild(opt);
    });
    updateSubjectSelect();
    yearSelect.value = valYear;
    subjectSelect.value = valSub;
}

function render(){
    const tb = document.getElementById("list");
    const thead = document.querySelector("#cashbook-panel table thead tr");
    
    // ヘッダー調整
    if (bulkEditMode) {
        if (!thead.querySelector('.bulk-checkbox-header')) {
            const th = document.createElement('th');
            th.className = 'bulk-checkbox-header';
            th.innerHTML = '<input type="checkbox" onchange="toggleAllCheckboxes(this)">';
            thead.insertBefore(th, thead.firstChild);
        }
    } else {
        const bulkHeader = thead.querySelector('.bulk-checkbox-header');
        if (bulkHeader) bulkHeader.remove();
    }
    
    tb.innerHTML = "";
    const year = document.getElementById("yearFilter").value;
    const month = document.getElementById("monthFilter").value;
    const subjectF = document.getElementById("subjectFilter").value;

    let viewData = data
        .map((d, idx) => ({ ...d, _idx: idx }))
        .filter(d => {
            const dt = new Date(d.date);
            if(year && dt.getFullYear()!=year) return false;
            if(month && dt.getMonth()+1!=month) return false;
            if(subjectF && d.subject!==subjectF) return false;
            return true;
        });

    viewData.sort((a,b) => a.date.localeCompare(b.date));

    let cash = startCash, bank = startBank;
    viewData.forEach((d) => {
        let ci = "", co = "", bi = "", bo = "";
        if (d.type === "収入") { 
            if (d.account === "現金"){
                ci = d.amount;
                cash += d.amount
            } else {
                bi = d.amount;
                bank += d.amount
            }
        }
        if (d.type === "支出") {
            if (d.account === "現金") {
                co = d.amount;
                cash -= d.amount
            } else {
                bo = d.amount;
                bank -= d.amount
            }
        }
        if (d.type === "振替") {
            if (d.account === "現金") {
                co = d.amount;
                bi = d.amount;
                cash -= d.amount;
                bank += d.amount;
            } else {
                bo = d.amount;
                ci = d.amount;
                bank -= d.amount;
                cash += d.amount
            }
        }
        
        if (bulkEditMode) {
            tb.innerHTML += renderEditableRow(d, ci, co, cash, bi, bo, bank);
        } else {
            tb.innerHTML += `<tr>
                <td>${d.date}</td>
                <td>${d.subject || ""}</td>
                <td>${d.content}</td>
                <td>${ci.toLocaleString()}</td><td>${co.toLocaleString()}</td><td>${cash.toLocaleString()}</td>
                <td>${bi.toLocaleString()}</td><td>${bo.toLocaleString()}</td><td>${bank.toLocaleString()}</td>
                <td>${d.note||""}</td>
                <td><button onclick="startEdit(${d._idx})">編集</button> <button onclick="del(${d._idx})">削除</button></td>
            </tr>`;
        }
    });
    document.getElementById("cashBal").textContent=cash.toLocaleString();
    document.getElementById("bankBal").textContent=bank.toLocaleString();
}

function toggleAllCheckboxes(checkbox) {
    if (checkbox.checked) {
        selectAllRows();
    } else {
        deselectAllRows();
    }
}

function renderEditableRow(d, ci, co, cash, bi, bo, bank) {
    const checked = selectedRows.has(d._idx) ? 'checked' : '';
    const subjectOptions = subjects.map(s => `<option value="${s}" ${d.subject===s?'selected':''}>${s}</option>`).join('');
    const transferDir = d.account === "通帳" ? "withdraw" : "deposit";
    
    return `<tr>
        <td><input type="checkbox" class="row-checkbox" data-idx="${d._idx}" ${checked} onchange="toggleRowSelect(${d._idx}); this.checked = selectedRows.has(${d._idx});"></td>
        <td><input type="date" data-idx="${d._idx}" data-field="date" value="${d.date}" style="width:120px;"></td>
        <td>
            <select data-idx="${d._idx}" data-field="subject" style="width:100px;">
                <option value="">(なし)</option>
                ${subjectOptions}
            </select>
        </td>
        <td><input type="text" data-idx="${d._idx}" data-field="content" value="${d.content}" style="width:150px;"></td>
        <td>${ci.toLocaleString()}</td>
        <td>${co.toLocaleString()}</td>
        <td>${cash.toLocaleString()}</td>
        <td>${bi.toLocaleString()}</td>
        <td>${bo.toLocaleString()}</td>
        <td>${bank.toLocaleString()}</td>
        <td>
            <select data-idx="${d._idx}" data-field="type" style="width:70px;" onchange="updateTypeVisibility(${d._idx})">
                <option value="収入" ${d.type==='収入'?'selected':''}>収入</option>
                <option value="支出" ${d.type==='支出'?'selected':''}>支出</option>
                <option value="振替" ${d.type==='振替'?'selected':''}>振替</option>
            </select>
        </td>
        <td>
            <select data-idx="${d._idx}" data-field="account" style="width:70px;${d.type==='振替'?'display:none;':''}">
                <option value="現金" ${d.account==='現金'?'selected':''}>現金</option>
                <option value="通帳" ${d.account==='通帳'?'selected':''}>通帳</option>
            </select>
            <select data-idx="${d._idx}" data-field="transferDir" style="width:70px;${d.type==='振替'?'':'display:none;'}">
                <option value="deposit" ${transferDir==='deposit'?'selected':''}>預入</option>
                <option value="withdraw" ${transferDir==='withdraw'?'selected':''}>引出</option>
            </select>
        </td>
        <td><input type="number" data-idx="${d._idx}" data-field="amount" value="${d.amount}" style="width:90px;"></td>
        <td><input type="text" data-idx="${d._idx}" data-field="note" value="${d.note||''}" style="width:120px;"></td>
        <td><button onclick="updateRow(${d._idx})">更新</button></td>
    </tr>`;
}

function updateTypeVisibility(idx) {
    const typeSelect = document.querySelector(`select[data-idx="${idx}"][data-field="type"]`);
    const accountSelect = document.querySelector(`select[data-idx="${idx}"][data-field="account"]`);
    const transferSelect = document.querySelector(`select[data-idx="${idx}"][data-field="transferDir"]`);
    
    if (typeSelect.value === "振替") {
        accountSelect.style.display = "none";
        transferSelect.style.display = "";
    } else {
        accountSelect.style.display = "";
        transferSelect.style.display = "none";
    }
}

// Excel出力
function exportExcel(){
    const wb = XLSX.utils.book_new();
    const year = document.getElementById("yearFilter").value;
    const month = document.getElementById("monthFilter").value;
    const subjectF = document.getElementById("subjectFilter").value;

    let viewData = data.filter(d=>{
        const dt = new Date(d.date);
        if(year && dt.getFullYear()!=year) return false;
        if(month && dt.getMonth()+1!=month) return false;
        if(subjectF && d.subject!==subjectF) return false;
        return true;
    });

    function createCellStyle(bold=false, bgColor=null, align="center", numFormat=false){
        const s={ font:{ bold:bold }, alignment:{ horizontal:align } };
        if(bgColor) s.fill={ fgColor:{ rgb:bgColor } };
        if(numFormat) s.numFmt="#,##0";
        return s;
    }

    // 出納帳
    const sheet1 = [["日付","科目","内容","現金収入","現金支出","現金残高","通帳収入","通帳支出","通帳残高","備考"]];
    let cash = startCash, bank = startBank;
    viewData.forEach(d=>{
        let ci="",co="",bi="",bo="";
        if(d.type==="収入"){ if(d.account==="現金"){ci=d.amount; cash+=d.amount} else{bi=d.amount; bank+=d.amount}}
        if(d.type==="支出"){ if(d.account==="現金"){co=d.amount; cash-=d.amount} else{bo=d.amount; bank-=d.amount}}
        if(d.type==="振替"){ if(d.account==="現金"){co=d.amount; bi=d.amount; cash-=d.amount; bank+=d.amount} else{bo=d.amount; ci=d.amount; bank-=d.amount; cash+=d.amount}}
        sheet1.push([d.date,d.subject,d.content,ci,co,cash,bi,bo,bank,d.note]);
    });
    const ws1 = XLSX.utils.aoa_to_sheet(sheet1);
    // ヘッダ装飾
    for(let c=0;c<10;c++){
        const cell = ws1[XLSX.utils.encode_cell({c:c,r:0})];
        if(cell) cell.s = createCellStyle(true,"FFFFCC","center");
    }

    // 金額列右揃え＋カンマ
    [3,4,5,6,7,8].forEach(c=>{
        for(let r=1;r<sheet1.length;r++){
            const cell = ws1[XLSX.utils.encode_cell({c:c,r:r})];
            if(cell) cell.s = createCellStyle(false,null,"right",true);
        }
    });
    XLSX.utils.book_append_sheet(wb, ws1, "出納帳");

    // 収支決算書
    const income={}, expense={};
    viewData.forEach(d=>{
        if(d.type==="収入") income[d.subject]=(income[d.subject]||0)+d.amount;
        if(d.type==="支出") expense[d.subject]=(expense[d.subject]||0)+d.amount;
    });
    const sheet2=[["令和〇年度 収支決算報告書"],[],["収入","","支出"],[]];
    const keys = [...new Set([...Object.keys(income),...Object.keys(expense)])];
    let tin=0, tout=0;
    
    keys.forEach(k=>{
        const i=income[k]||""; const o=expense[k]||""; if(i) tin+=i; if(o) tout+=o;
        sheet2.push([k,i,k,o]);
    });
    sheet2.push(["合計",tin,"合計",tout]);
    const ws2 = XLSX.utils.aoa_to_sheet(sheet2);
    // ヘッダ装飾
    for(let c=0;c<4;c++){
    const cell = ws2[XLSX.utils.encode_cell({c:c,r:2})]; if(cell) cell.s = createCellStyle(true,"FFFFCC","center");
    }
    // 合計行装飾
    const lastRow = sheet2.length-1;
    for(let c=0;c<4;c++){
    const cell = ws2[XLSX.utils.encode_cell({c:c,r:lastRow})]; if(cell) cell.s = createCellStyle(true,"DDDDDD","right",true);
    }
    XLSX.utils.book_append_sheet(wb, ws2, "収支決算書");

    // 科目別
    const subjectsMap={};
    viewData.forEach(d=>{ if(!subjectsMap[d.subject]) subjectsMap[d.subject]=[]; subjectsMap[d.subject].push(d); });
    Object.keys(subjectsMap).forEach(s=>{
    const sh=[["日付","内容","金額","備考"]];
    let sum=0;
    subjectsMap[s].forEach(d=>{sum+=d.amount; sh.push([d.date,d.content,d.amount,d.note])});
    sh.push(["小計","",sum,""]);
    const ws = XLSX.utils.aoa_to_sheet(sh);
    // ヘッダ装飾
    for (let c=0;c<4;c++){
        const cellH = ws[XLSX.utils.encode_cell({c:c,r:0})];
        if (cellH) 
            cellH.s = createCellStyle(true,"FFFFCC","center");
        const lastR = sh.length-1;
        const cellF = ws[XLSX.utils.encode_cell({c:c,r:lastR})];
        if (cellF) 
            cellF.s = createCellStyle(true,"DDDDDD","right",true);
    }

    // 金額列右揃え＋カンマ
    for (let r=1;r<sh.length-1;r++){
        const cell = ws[XLSX.utils.encode_cell({c:2,r:r})];
        if (cell)
            cell.s = createCellStyle(false,null,"right",true);
    }

    XLSX.utils.book_append_sheet(wb, ws, s);
    });

    XLSX.writeFile(wb,"会計.xlsx");
}