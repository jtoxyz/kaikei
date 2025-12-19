let data = JSON.parse(localStorage.getItem("kaikei")) || [];
let subjects = JSON.parse(localStorage.getItem("subjects")) || [];
let startCash = Number(localStorage.getItem("startCash") || 0);
let startBank = Number(localStorage.getItem("startBank") || 0);
let editIndex = null;
let bulkEditMode = false;
let selectedRows = new Set();

async function saveData() {
    const pw = localStorage.getItem("password");
    if (!pw) return; // パスワード未設定時はリモート保存しない
    const payload = {
        kaikei: localStorage.getItem("kaikei"),
        subjects: localStorage.getItem("subjects"),
        startCash: localStorage.getItem("startCash"),
        startBank: localStorage.getItem("startBank"),
    }
    try {
        await fetch("https://kaikei.osu-gakkenpo.workers.dev/?pw=" + pw, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    } catch (_) { /* 通信失敗は無視（ローカルは保持） */ }
}

async function loadData() {
    const pw = localStorage.getItem("password");
    if (!pw) return; // パスワード未設定なら同期しない（ローカル優先）
    try {
        const res = await fetch("https://kaikei.osu-gakkenpo.workers.dev/?pw=" + pw, { method: "GET" });
        if (!res.ok) return;
        const obj = await res.json();
        // 有効な値のみ上書きしてローカルの空データ上書きを防止
        if (obj && typeof obj.kaikei === 'string') localStorage.setItem("kaikei", obj.kaikei);
        if (obj && typeof obj.subjects === 'string') localStorage.setItem("subjects", obj.subjects);
        if (obj && obj.startCash !== undefined && obj.startCash !== null) localStorage.setItem("startCash", obj.startCash);
        if (obj && obj.startBank !== undefined && obj.startBank !== null) localStorage.setItem("startBank", obj.startBank);
        // メモリ上の値も同期
        data = JSON.parse(localStorage.getItem("kaikei")) || [];
        subjects = JSON.parse(localStorage.getItem("subjects")) || [];
        startCash = Number(localStorage.getItem("startCash") || 0);
        startBank = Number(localStorage.getItem("startBank") || 0);
    } catch (_) {
        // 失敗時はローカルのまま使う
    }
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

async function saveData() {
    const pw = localStorage.getItem("password");
    if (!pw) return; // パスワード未設定時はリモート保存しない
    const payload = {
        kaikei: localStorage.getItem("kaikei"),
        subjects: localStorage.getItem("subjects"),
        startCash: localStorage.getItem("startCash"),
        startBank: localStorage.getItem("startBank"),
    }
    try {
        await fetch("https://kaikei.osu-gakkenpo.workers.dev/?pw=" + pw, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    } catch (_) { /* 通信失敗は無視（ローカルは保持） */ }
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

// 単体削除（通常モード用）
function del(i){
    if (!confirm("削除しますか？")) return;
    data.splice(i,1);
    localStorage.setItem("kaikei", JSON.stringify(data));
    saveData();
    updateFilters();
    render();
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
    const original = data[idx];
    const updatedEntry = {
        ...original,
        date: document.querySelector(`input[data-idx="${idx}"][data-field="date"]`).value,
        subject: document.querySelector(`select[data-idx="${idx}"][data-field="subject"]`).value,
        content: document.querySelector(`input[data-idx="${idx}"][data-field="content"]`).value,
        note: document.querySelector(`input[data-idx="${idx}"][data-field="note"]`).value
    };

        data[idx] = updatedEntry;
        data.sort((a,b)=>a.date.localeCompare(b.date));
        localStorage.setItem("kaikei", JSON.stringify(data));
        saveData();
        updateFilters();
        render();

    data[idx] = updatedEntry;
    data.sort((a,b)=>a.date.localeCompare(b.date));
    localStorage.setItem("kaikei", JSON.stringify(data));
    saveData();
    updateFilters();
    render();
}

function addSubject(){
    const raw = prompt("新しい科目名を入力してください");
    const newSub = (raw || "").trim();
    if(!newSub){
        alert("科目名が空です");
        return;
    }
    const dup = subjects.some(s => s.toLowerCase() === newSub.toLowerCase());
    if(dup){
        alert("同名の科目が既にあります");
        return;
    }
    subjects.push(newSub);
    localStorage.setItem("subjects", JSON.stringify(subjects));
    updateSubjectSelect();
    const subSelect = document.getElementById("subject");
    if (subSelect) subSelect.value = newSub;
    saveData(); // パスワード設定時はリモートにも同期
    alert("科目を追加しました");
}

function updateSubjectSelect(){
    const subSelect = document.getElementById("subject");
    if (subSelect) {
        subSelect.innerHTML="<option value=\"\">(なし)</option>";
        subjects.forEach(s=>{
            const opt = document.createElement("option");
            opt.value=s; opt.textContent=s;
            subSelect.appendChild(opt);
        });
    }
    const subFilter = document.getElementById("subjectFilter");
    if (subFilter) {
        const val = subFilter.value;
        subFilter.innerHTML='<option value="">すべて</option>';
        subjects.forEach(s=>{
            const opt = document.createElement("option");
            opt.value=s; opt.textContent=s;
            subFilter.appendChild(opt);
        });
        subFilter.value = val;
    }
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
    const kw = (document.getElementById('kwFilter')?.value || '').trim();
    const amountMin = document.getElementById('amountMin')?.value;
    const amountMax = document.getElementById('amountMax')?.value;

    // 高度フィルタ: キーワード(内容/備考), 金額範囲 を追加
    let viewData = data
        .map((d, idx) => ({ ...d, _idx: idx }))
        .filter(d => {
            const dt = new Date(d.date);
            if(year && dt.getFullYear()!=year) return false;
            if(month && dt.getMonth()+1!=month) return false;
            if(subjectF && d.subject!==subjectF) return false;
            if (kw) {
                const text = `${d.content||''}\n${d.note||''}`;
                if (!text.includes(kw)) return false;
            }
            if (amountMin && !(Number(d.amount) >= Number(amountMin))) return false;
            if (amountMax && !(Number(d.amount) <= Number(amountMax))) return false;
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

/** 総編集: 区分選択でUIの切り替え */
function bulkTypeChanged(){
    const t = document.getElementById('bulkType')?.value;
    const acc = document.getElementById('bulkAccountWrap');
    const trf = document.getElementById('bulkTransferWrap');
    if (!acc || !trf) return;
    if (t === '振替'){
        acc.style.display = 'none';
        trf.style.display = '';
    } else if (t){
        acc.style.display = '';
        trf.style.display = 'none';
    } else {
        // 変更しない
        acc.style.display = '';
        trf.style.display = 'none';
    }
}

/**
 * 総編集: 選択行に対し 区分/口座(振替方向)/金額 を一括適用
 * 金額は未入力なら変更しない
 */
function applyBulkChanges(){
    if (selectedRows.size===0){ alert('対象行を選択してください'); return; }
    const t = document.getElementById('bulkType')?.value || '';
    const acc = document.getElementById('bulkAccount')?.value || '';
    const dir = document.getElementById('bulkTransferDir')?.value || '';
    const amtStr = document.getElementById('bulkAmount')?.value || '';
    const amt = amtStr!=='' ? Number(amtStr) : null;

    Array.from(selectedRows).forEach(idx=>{
        const d = {...data[idx]};
        if (t){ d.type = t; }
        if (d.type === '振替'){
            // 振替時は account を方向から決定
            if (dir) d.account = (dir==='withdraw') ? '通帳' : '現金';
        } else {
            if (acc) d.account = acc;
        }
        if (amt!==null) d.amount = amt;
        data[idx] = d;
    });
    localStorage.setItem('kaikei', JSON.stringify(data));
    saveData();
    render();
    alert('一括適用しました');
}

/** バックアップをJSONでダウンロード */
function exportBackup(){
    const payload = {
        kaikei: data,
        subjects,
        startCash,
        startBank
    };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kaikei-backup.json';
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
}

/** バックアップJSONを読み込み復元 */
function importBackup(ev){
    const file = ev.target.files?.[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
        try {
            const obj = JSON.parse(rd.result);
            if (obj.kaikei) { data = obj.kaikei; localStorage.setItem('kaikei', JSON.stringify(data)); }
            if (obj.subjects) { subjects = obj.subjects; localStorage.setItem('subjects', JSON.stringify(subjects)); }
            if (obj.startCash!=null) { startCash = Number(obj.startCash); localStorage.setItem('startCash', String(startCash)); }
            if (obj.startBank!=null) { startBank = Number(obj.startBank); localStorage.setItem('startBank', String(startBank)); }
            updateSubjectSelect();
            render();
            alert('復元しました');
        } catch(e){
            alert('復元に失敗しました: '+ e);
        }
    };
    rd.readAsText(file);
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

        const targetYear = Number(year) || new Date().getFullYear();
        const eraTitle = targetYear >= 2019 ? `令和${targetYear - 2018}年度` : `${targetYear}年度`;
        const makeTitle = (label) => `${eraTitle} ${label}`;

        let viewData = data.filter(d=>{
            const dt = new Date(d.date);
            if(year && dt.getFullYear()!=year) return false;
            if(month && dt.getMonth()+1!=month) return false;
            if(subjectF && d.subject!==subjectF) return false;
            return true;
        });

        const moneyFmt = "#,##0;[Red]-#,##0";
        const borderThin = { top:{style:"thin"}, left:{style:"thin"}, right:{style:"thin"}, bottom:{style:"thin"} };
        function createCellStyle(bold=false, bgColor=null, align="center", numFormat=false){
            const s={ font:{ bold:bold }, alignment:{ horizontal:align } };
            if(bgColor) s.fill={ fgColor:{ rgb:bgColor } };
            if(numFormat) s.numFmt=numFormat===true?moneyFmt:numFormat;
            return s;
        }
        const applyBorders = (ws, startRow, endRow, startCol, endCol) => {
            for(let r=startRow; r<=endRow; r++){
                for(let c=startCol; c<=endCol; c++){
                    const cellRef = XLSX.utils.encode_cell({c,r});
                    const cell = ws[cellRef] || {};
                    cell.s = { ...(cell.s||{}), border: borderThin };
                    ws[cellRef] = cell;
                }
            }
        };
        const usedSheetNames = new Set();
        const makeSheetNameSafe = (name) => {
            const baseRaw = (name || "未分類").trim() || "未分類";
            const base = baseRaw.replace(/[\\/?*\[\]:]/g,"-").slice(0,25);
            let candidate = base;
            let i = 1;
            while(usedSheetNames.has(candidate)){
                candidate = `${base}_${i++}`;
            }
            usedSheetNames.add(candidate);
            return candidate;
        };

        // 出納帳
        const sheet1 = [
            [makeTitle("出納帳"),"","","","","","","","",""],
            ["日付","科目","内容","現金収入","現金支出","現金残高","通帳収入","通帳支出","通帳残高","備考"]
        ];
        let cash = startCash, bank = startBank;
        viewData.forEach(d=>{
            let ci="",co="",bi="",bo="";
            if(d.type==="収入"){ if(d.account==="現金"){ci=d.amount; cash+=d.amount} else{bi=d.amount; bank+=d.amount}}
            if(d.type==="支出"){ if(d.account==="現金"){co=d.amount; cash-=d.amount} else{bo=d.amount; bank-=d.amount}}
            if(d.type==="振替"){ if(d.account==="現金"){co=d.amount; bi=d.amount; cash-=d.amount; bank+=d.amount} else{bo=d.amount; ci=d.amount; bank-=d.amount; cash+=d.amount}}
            sheet1.push([d.date,d.subject,d.content,ci,co,cash,bi,bo,bank,d.note]);
        });
        const ws1 = XLSX.utils.aoa_to_sheet(sheet1);
        ws1['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:9} }];
        // レイアウト: 列幅/フリーズ/フィルタ
        ws1['!cols'] = [
            {wch:12},{wch:12},{wch:18},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:16}
        ];
        ws1['!freeze'] = { xSplit:0, ySplit:2 };
        ws1['!autofilter'] = { ref: `A2:J${sheet1.length}` };

        // ヘッダー調整
        for(let c=0;c<10;c++){
            const cell = ws1[XLSX.utils.encode_cell({c:c,r:0})];
            if(cell) cell.s = createCellStyle(true,"DDDDDD","center");
            const cell2 = ws1[XLSX.utils.encode_cell({c:c,r:1})];
            if(cell2) cell2.s = createCellStyle(true,"FFFFCC","center");
        }

        // 書式: 日付/金額列＋交互色
        for(let r=2;r<sheet1.length;r++){
            const isOdd = (r % 2) === 1;
            const fill = isOdd ? { fgColor:{ rgb:"F7F7F7" } } : null;
            // 日付
            const dateCell = ws1[XLSX.utils.encode_cell({c:0,r:r})];
            if(dateCell) dateCell.s = createCellStyle(false,null,"center","yyyy-mm-dd");
            [3,4,5,6,7,8].forEach(c=>{
                const cell = ws1[XLSX.utils.encode_cell({c:c,r:r})];
                if(cell) cell.s = createCellStyle(false,null,"right",moneyFmt);
            });
            for(let c=0;c<10;c++){
                const cell = ws1[XLSX.utils.encode_cell({c:c,r:r})];
                if(cell && fill) cell.s = { ...(cell.s||{}), fill };
            }
        }
        applyBorders(ws1, 0, sheet1.length-1, 0, 9);
        XLSX.utils.book_append_sheet(wb, ws1, "出納帳");

        // 収支計算書
        const income={}, expense={};
        viewData.forEach(d=>{
            if(d.type==="収入") income[d.subject]=(income[d.subject]||0)+d.amount;
            if(d.type==="支出") expense[d.subject]=(expense[d.subject]||0)+d.amount;
        });

        const incomeRows = Object.keys(income).map(k=>({ item:k, amt: income[k], note:"" }));
        const expenseRows = Object.keys(expense).map(k=>({ item:k, budget:"", actual: expense[k], diff:"" }));
        const maxRows = Math.max(incomeRows.length, expenseRows.length);
        const sheet2 = [
            [makeTitle("収支計算書"),"","","","","",""],
            ["収入","","","支出","","",""],
            ["項目","金額","備考","項目","予算","実績","差額"]
        ];
        let tin=0, tout=0;
        for(let i=0;i<maxRows;i++){
            const ir = incomeRows[i] || {item:"", amt:"", note:""};
            const er = expenseRows[i] || {item:"", budget:"", actual:"", diff:""};
            if(typeof ir.amt === "number") tin += ir.amt;
            if(typeof er.actual === "number") tout += er.actual;
            sheet2.push([ir.item, ir.amt, ir.note, er.item, er.budget, er.actual, er.diff]);
        }
        sheet2.push(["合計", tin, "", "合計", "", tout, ""]);

        const ws2 = XLSX.utils.aoa_to_sheet(sheet2);
        ws2['!merges'] = [
            { s:{r:0,c:0}, e:{r:0,c:6} }, // タイトル
            { s:{r:1,c:0}, e:{r:1,c:2} }, // 収入ヘッダ
            { s:{r:1,c:3}, e:{r:1,c:6} }  // 支出ヘッダ
        ];
        ws2['!cols'] = [{wch:18},{wch:14},{wch:16},{wch:18},{wch:10},{wch:14},{wch:14}];
        ws2['!freeze'] = { xSplit:0, ySplit:3 };
        ws2['!autofilter'] = { ref: `A3:G${sheet2.length}` };

        // ヘッダ装飾
        for(let c=0;c<7;c++){
            const cellT = ws2[XLSX.utils.encode_cell({c:c,r:0})]; if(cellT) cellT.s = createCellStyle(true,"DDDDDD","center");
        }
        for(let c=0;c<7;c++){
            const cell = ws2[XLSX.utils.encode_cell({c:c,r:1})]; if(cell) cell.s = createCellStyle(true,"FFFFCC","center");
        }
        for(let c=0;c<7;c++){
            const cell = ws2[XLSX.utils.encode_cell({c:c,r:2})]; if(cell) cell.s = createCellStyle(true,"EEEEEE","center");
        }

        // 金額列書式＋交互色
        for(let r=3;r<sheet2.length;r++){
            const isOdd = (r % 2) === 0; // data rows start at 3, make striped
            const fill = isOdd ? { fgColor:{ rgb:"F7F7F7" } } : null;
            [1,5,6].forEach(c=>{
                const cell = ws2[XLSX.utils.encode_cell({c:c,r:r})];
                if(cell) cell.s = createCellStyle(false,null,"right",moneyFmt);
            });
            for(let c=0;c<7;c++){
                const cell = ws2[XLSX.utils.encode_cell({c:c,r:r})];
                if(cell && fill) cell.s = { ...(cell.s||{}), fill };
            }
        }
        // 合計行装飾
        const lastRow = sheet2.length-1;
        for(let c=0;c<7;c++){
            const cell = ws2[XLSX.utils.encode_cell({c:c,r:lastRow})]; if(cell) cell.s = createCellStyle(true,"DDDDDD","right",moneyFmt);
        }
        applyBorders(ws2, 0, sheet2.length-1, 0, 6);
        XLSX.utils.book_append_sheet(wb, ws2, "収支計算書");

        // 科目別
        const subjectsMap={};
    viewData.forEach(d=>{ if(!subjectsMap[d.subject]) subjectsMap[d.subject]=[]; subjectsMap[d.subject].push(d); });
    Object.keys(subjectsMap).forEach(s=>{
        const sh=[
            [makeTitle(`${s} 明細`),"","",""],
            ["日付","内容","金額","備考"]
        ];
        let sum=0;
        subjectsMap[s].forEach(d=>{sum+=d.amount; sh.push([d.date,d.content,d.amount,d.note])});
        sh.push(["小計","",sum,""]);
        const ws = XLSX.utils.aoa_to_sheet(sh);
        ws['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:3} }];
        ws['!cols'] = [{wch:12},{wch:22},{wch:12},{wch:20}];
        ws['!freeze'] = { xSplit:0, ySplit:2 };
        ws['!autofilter'] = { ref: `A2:D${sh.length}` };
        // ヘッダ装飾
        for (let c=0;c<4;c++){
            const cellT = ws[XLSX.utils.encode_cell({c:c,r:0})];
            if (cellT) cellT.s = createCellStyle(true,"DDDDDD","center");
            const cellH = ws[XLSX.utils.encode_cell({c:c,r:1})];
            if (cellH) cellH.s = createCellStyle(true,"FFFFCC","center");
            const lastR = sh.length-1;
            const cellF = ws[XLSX.utils.encode_cell({c:c,r:lastR})];
            if (cellF) cellF.s = createCellStyle(true,"DDDDDD","right",moneyFmt);
        }

        // 金額列右揃え＋カンマ＋交互色
        for (let r=2;r<sh.length-1;r++){
            const isOdd = (r % 2) === 1;
            const fill = isOdd ? { fgColor:{ rgb:"F7F7F7" } } : null;
            const cell = ws[XLSX.utils.encode_cell({c:2,r:r})];
            if (cell) cell.s = createCellStyle(false,null,"right",moneyFmt);
            for(let c=0;c<4;c++){
                const cellRow = ws[XLSX.utils.encode_cell({c:c,r:r})];
                if (cellRow && fill) cellRow.s = { ...(cellRow.s||{}), fill };
            }
        }
        applyBorders(ws, 0, sh.length-1, 0, 3);
        XLSX.utils.book_append_sheet(wb, ws, s);
    });

    XLSX.writeFile(wb,"会計.xlsx");
}