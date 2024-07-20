let dirHandle;
let handleMap = {};
const btn = document.querySelector('button');
btn.onclick = async function(){
	try{
		const handle = await showDirectoryPicker();
		dirHandle = await processHandle(handle);
		WzFile.destroy();
		showDirectory();
		
	}catch(err) {
		console.log("拒绝访问文件夹",err);
	}
	
	async function processHandle(handle){
		if(handle.kind === 'file'){
			handleMap[handle.name] = handle;
			return handle;
		}
		handle.children = [];
		// 异步迭代器
		const iter = handle.entries();
		for await (const item of iter){
			handle.children.push(await processHandle(item[1]));
			
		}
		return handle;
	}
};

//显示目录列表
function showDirectory(){
	const directoryList = document.getElementById('directoryContents');
	directoryList.innerHTML = ''; 
	// 遍历并显示目录项
	/*const listItem = document.createElement('li');
	listItem.textContent = `${dirHandle.name}`;
	directoryList.appendChild(listItem);*/
	if(dirHandle.kind == 'directory'){
		showSubDirectory(dirHandle.children);
		navDirectory();
	}
	function showSubDirectory(list){
		for(let i = 0; i < list.length; i++){
			const listItem = document.createElement('li');
			listItem.setAttribute('data-name',list[i].name);
			if (list[i].kind === 'file') {
                listItem.textContent = `${list[i].name}`;
				directoryList.appendChild(listItem);
            } else if (list[i].kind === 'directory') {
                listItem.textContent = `子目录: ${list[i].name}`;
				directoryList.appendChild(listItem);
				showSubDirectory(list[i].children);
            }
		}
	}
}
function navDirectory(){
	let preName, pre;
	let elements = document.getElementById('directoryContents').querySelectorAll('li'); 
	// 遍历并添加事件监听器  
	elements.forEach(function(element) {  
		element.addEventListener('click', function(e) {
			const name = e.target.getAttribute('data-name');
			if(preName != name){
				if(name.endsWith(".wz")){
					if(pre){
						pre.innerHTML = preName;
					}
					preName = name;
					pre = e.target;
				}
			}
			
			if(e.target.children.length > 0){
				e.target.innerHTML = e.target.childNodes[0].data;
				return;
			}
			clearActive(name);
			e.target.classList='active';
			if(name && name.endsWith(".wz")){
				document.querySelector(".tip").style.height="100%";
				WzFile.initData(name, handleMap[name]).then((res)=>{
					e.target.innerHTML = name;
					let dirs = WzFile.getDirDataMap(name);
					subDirectory(name, e.target, dirs);
					showDirImg(name);
					document.querySelector(".tip").style.height="0";
				});
			}else{
				WzFile.getDir(name).then(res =>{
					let dirs = WzFile.getDirDataMap(name);
					subDirectory(name, e.target, dirs);
					showDirImg(name);
				});
			}
			console.log(e,name);
			
		});  
	});
	function subDirectory(name, parentEl, dirs){
		let bl = true;
		const ulEl = document.createElement('ul');
		for(const key in dirs){
			if(bl){
				parentEl.appendChild(ulEl);
				bl = false;
			}
			const item = document.createElement('li');
			item.setAttribute('data-name', name+"/"+dirs[key].name);
			item.textContent = dirs[key].name;
			ulEl.appendChild(item);
		}
	}
}
function clearActive(curName){
	let activeEls = document.getElementsByClassName('active');
	if(curName.endsWith(".img")){
		for(let i = 0; i < activeEls.length;i++){
			let name = activeEls[i].dataset.name;
			if(name.endsWith(".img")){
				if(curName != name){
					activeEls[i].classList = '';
				}
			}
		}
	}else{
		for(let i = 0; i < activeEls.length;i++){
			let name = activeEls[i].dataset.name;
			if(!name.endsWith(".img")){
				if(curName != name){
					activeEls[i].classList = '';
				}
			}
		}
	}
}
//显示子目录和img
function showDirImg(name){
	const el = document.getElementById('wzImgs');
	el.innerHTML = ''; 
	let imgDataList = WzFile.getImgDataMap(name);
	for(const key in imgDataList){
		const it = imgDataList[key];
		const item = document.createElement('li');
		item.setAttribute('data-name',name+"/"+it.name);
		item.innerHTML = `Name: <red>${it.name}<\/red><br>
								Size: ${it.size}<br>
								CheckSumSize: ${it.checkSumSize}<br>
								Offset: ${it.offset}`;
		el.appendChild(item);
	}
	navDirImg();
	
}
function navDirImg(){
	var elements = document.getElementById('wzImgs').querySelectorAll('li'); 
	// 遍历并添加事件监听器  
	elements.forEach(function(element) {  
		element.addEventListener('click', function(e) {
			// e.target可能是element子元素
			const name = element.getAttribute('data-name');
			clearActive(name);
			element.classList='active';
			WzFile.getImg(name);
			showImgProps(name);
			
		});
	});
}
//显示 img下的props
function showImgProps(name){
	const el = document.getElementById('wzImgProps');
	el.innerHTML = ''; 
	let props = WzFile.getImgProps(name);
	//console.log('props',props);
	function subProps(prop, parentEl){
		for(let i = 0; i < prop.length; i++){
			const it = prop[i];
			const item = document.createElement('li');
				item.setAttribute('data-name',it.key);
			if(it.children != undefined){
				if(it.children.length == 0){
					item.innerHTML = `<span>${it.key}<\/span>`;
					if(it.children && it.children.value){
						const ulEl = document.createElement('ul');
						ulEl.classList = "wz-ul";
						const liEl = document.createElement('li');
						if(it.children.value.x){//一般prop带的属性
							liEl.innerHTML += `<span>x: ${it.children.value.x}<\/span>
												<span>y: ${it.children.value.y}<\/span>`;
						}else if(it.children.value.ms){// sound带的属性
							liEl.classList = "sound";
							liEl.innerHTML += `<button onclick="loadSound('${name}',${it.children.value.offset})" >加载音频<\/button>
												<span>length: ${it.children.value.length}<\/span>
												<span>ms: ${it.children.value.ms}<\/span>
												<span>offset: ${it.children.value.offset}<\/span>`;	
						}
						item.appendChild(ulEl);
						ulEl.appendChild(liEl);
					}
					parentEl.appendChild(item);
				}else{
					item.innerHTML = `<span>${it.key}<\/span><br>`;
					if(it.children.value && it.children.value.bufSize &&
						it.children.value.width && it.children.value.height){//图片
						item.innerHTML = `<button onclick="loadImg('${name}',${it.children.value.offset})">加载图片<\/button>
											<span>${it.key}<\/span>
											<span>w:${it.children.value.width}<\/span>
											<span>h:${it.children.value.height}<\/span>
											<span>size:${it.children.value.bufSize}<\/span>`;
					}
					parentEl.appendChild(item);
					const ulEl = document.createElement('ul');
					ulEl.classList = "wz-ul";
					item.appendChild(ulEl);
					subProps(it.children, ulEl);
				}
			}else{
				if(it.value && typeof(it.value) == 'object'){
					item.innerHTML = `<span>x: ${it.value.x}<\/span>
									<span>y: ${it.value.y}<\/span> `;
				}else{
					item.innerHTML = `<span>${it.key}<\/span>
									<span>${it.value}<\/span>
									<span>${it.type}<\/span> `;
				}
				parentEl.appendChild(item);
			}
		}
		
	}
	subProps(props, el);
}
function loadSound(name, offset){
	let wzName = name.substr(0, name.indexOf("/"));
	WzSound.extractSound(wzName, offset);
	WzSound.playSound(wzName, offset);
}
function loadImg(name, offset){
	let wzName = name.substr(0, name.indexOf("/"));
	WzPng.getImgRawData(wzName, offset);
	WzPng.displayImageOnCanvas(wzName, offset);
}
window.addEventListener('beforeunload', function(event) {
	WzFile.destroy();
	console.log("销毁数据");
});