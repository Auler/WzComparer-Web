const WzCrypto = (function(){
	const AES_KEY ='130000000800000006000000B40000001B0000000F0000003300000052000000';
	const IV = 'B97D63E9B97D63E9B97D63E9B97D63E9';
	const aesData = {
		lastHexStr: "",
		cipherMask: [],
	};
	return {
		/**
			Field
		*/
		getCipherMask:function(){
			return aesData.cipherMask;
		},
		setIV:function(iv){
			if(iv == undefined || iv == "" || iv.length != 16){
				console.warn(`iv must be exist and iv.length == 16`);
				return ;
			}
			IV = iv;
			return ;
		},
		/**
			Methods
		*/
		encryptAes256Ecb: function (hexStr) {
			const key = CryptoJS.enc.Hex.parse(AES_KEY);
			const dataWordArray = CryptoJS.enc.Hex.parse(hexStr);
			const encrypted = CryptoJS.AES.encrypt(
							dataWordArray,
							key, 
							{
								mode: CryptoJS.mode.ECB,
								padding: CryptoJS.pad.NoPadding 
							});
			return CryptoJS.enc.Hex.stringify(encrypted.ciphertext);
			//return this.wordArrayToUint8Array(encrypted.ciphertext);
		},
		wordArrayToUint8Array:function(wordArray) {
			let len = wordArray.sigBytes;
			let u8Array = new Uint8Array(len); 
			for (let i = 0; i < len; i++) {
				u8Array[i] = wordArray.words[i >>> 2] >>> ((i % 4) * 8) & 0xff;
			}

			return u8Array;
		},
		ensureSize:function(len){
			if(len <= 0){
				console.warn(`ensureSize len must be > 0, len:${len}`);
				return;
			}
			const curLen = aesData.cipherMask.length;
			if(curLen >= len){
				return;
			}
			let hexStr = IV;
			if(curLen > 0){
				hexStr = aesData.lastHexStr;
			}
			let n = Math.ceil(len / 16) * 16;
			for(let i = curLen; i < n; i+=16){
				hexStr = this.encryptAes256Ecb(hexStr);
				for(let j = 0; j < hexStr.length; j+=2){
					let d = parseInt(hexStr.charAt(j),16) * 16 + parseInt(hexStr.charAt(j+1),16);
					aesData.cipherMask.push(d);
				}
			}
			aesData.lastHexStr = hexStr;
			return ;
		},
		decrypt:function(arr){
			if(arr.length <= 0){
				console.warn(`decrypto arr is empty, arr.length:${arr.length}`);
				return;
			}
			this.ensureSize(arr.length);
			const cipherMask = aesData.cipherMask;
			for(let i = 0; i < arr.length; i++){
				arr[i] ^= cipherMask[i];
			}
			return ;
		},
		xorAA: function(arr){
			if(arr.length <= 0){
				console.warn(`xorAA arr is empty, arr.length:${arr.length}`);
				return;
			}
			this.ensureSize(arr.length);
			const cipherMask = aesData.cipherMask;
			let a = 0xAA;
			for(let i = 0; i < arr.length; i++){
				arr[i] = a ^ arr[i] ^ cipherMask[i];
				a = (a + 1) & 0xFF;
			}
			return ;
		},
		xorAAAA: function(arr){
			if(arr.length <= 0){
				console.warn(`xorAAAA arr is empty, arr.length:${arr.length}`);
				return;
			}
			this.ensureSize(arr.length);
			const cipherMask = aesData.cipherMask;
			let a = 0xAAAA;
			for(let i = 0; i < arr.length; i+=2){
				arr[i] = ((a & 0xFF) ^ arr[i] ^ cipherMask[i]) & 0xFF;
				arr[i + 1] = (((a >> 8) & 0xFF) ^ arr[i + 1] ^ cipherMask[i + 1]) & 0xFF;
				a = (a + 1) & 0xFFFF;
			}
			return ;
		},
	};
})();
const WzFile = (function(){
	/**
		wzDataMap['Base.wz']={
			data:[],
			pos:0,
		};
	*/
	let wzDataMap = {};
	let curWzData;
	let curWzName;
	let VERSION = 79;
	let HASH_VERSION;
	let soundMap = {};
	let pngMap = {};
	return {
		/**
			Fields
		*/
		getCurWzData:function(){
			return curWzData;
		},
		getWzDataMap:function(){
			return wzDataMap;
		},
		getSoundMap:function(offset){
			if(offset){
				return soundMap[curWzName+":"+offset];
			}
			return soundMap;
		},
		getPngMap:function(offset){
			if(offset){
				return pngMap[curWzName+":"+offset];
			}
			return pngMap;
		},
		getImgProps: function(name){ 
			if(!name.endsWith(".img")){
				console.log("不是img文件",name);
				return;
			}
			const idx = name.lastIndexOf("/");
			if(idx == -1)return;
			let preName = name.substr(0, idx);
			let sufName = name.substr(idx + 1);
			return this.getLayerDataMap(preName)["img"][sufName].props;
		},
		/**
			Base.wz:{
				dir:{
					Map:{
						dir:{
							Map0:{
								dir
								img
								offset
								...
							}
						}
					}
			}
			@param Base.wz/Map/Map0
			@return Map0;
		*/
		getLayerDataMap:function(name){
			let arr = name.split("/");
			let len = arr.length;
			let data = wzDataMap[curWzName];
			for(let i = 1; i < len; i++){
				data = data.dir[arr[i]];
			}
			return data;
		},
		getImgDataMap: function(name){
			return this.getLayerDataMap(name).img;
		},
		getDirDataMap: function(name){
			return this.getLayerDataMap(name).dir;
		},
		setCurWzPos:function(pos){
			if(typeof(pos) != "number"){
				return false;
			}
			curWzData.pos = pos;
			return true;
		},
		setCurWzData:function(wzName){
			if(wzName == undefined || wzName == ""){
				console.warn(`wzName is empty. wzName: ${wzName}`);
				return false;
			}
			curWzData = wzDataMap[wzName];
			curWzName = wzName;
			return true;
		},
		setVersion:function(v){
			if(typeof(v) != "number" || v <= 0){
				console.warn(`v is must be number and v > 0.`);
				return false;
			}
			VERSION = v;
			return true;
		},
		/**
			Methods
		*/
		readFile: async function(fileHandle){
			async function readFileInChunks(fileHandle, chunkSize = 1024 * 1024) { // 1MB chunk size by default
				const file = await fileHandle.getFile();
				const chunks = []; 
				const readChunk = async (offset) => {
					const reader = new FileReader();
					const blob = file.slice(offset, offset + chunkSize);
					return new Promise((resolve, reject) => {
						reader.onloadend = () => {
							const chunkArrayBuffer = reader.result;
							const u8Array = new Uint8Array(chunkArrayBuffer);
							//const dataView = new DataView(chunkArrayBuffer);
							//console.log(dataView);
							chunks.push(u8Array);
							resolve();
						};
						reader.onerror = reject;
						reader.readAsArrayBuffer(blob);
					});
				};

				for (let offset = 0; offset < file.size; offset += chunkSize) {
					await readChunk(offset);
				}
				return chunks;
			}
			const res = await readFileInChunks(fileHandle);
			wzDataMap[fileHandle.name] = {
				data: res,
				pos: 0
			};
			if(res.length > 0){
				return true;
			}
			return false;
		},
		calVersion: function(){
			let hash = BigInt(0);
			const versionStr = VERSION.toString();
			for (const digitChar of versionStr) {
				const digit = parseInt(digitChar, 10);
				hash = (hash * BigInt(32)) + BigInt(digit) + BigInt(49);
			}
			let hashBytes = [];
			while (hash > 0n) {
				hashBytes.unshift(hash & 0xffn);
				hash >>= 8n; 
			}
			while (hashBytes.length < 4) {
				hashBytes.unshift(0n);
			}
			hash = 0n;
			for (const b of hashBytes) {
				hash = (hash << 8n) | b;
			}
			return Number(hash);
		},
		calOffset: function(offset, hash){
			let imgOffset = BigInt(offset);
			let hashVersion = BigInt(HASH_VERSION);
			imgOffset = (imgOffset ^ 0xFFFFFFFFn) & 0xFFFFFFFFn;
			imgOffset = (imgOffset * hashVersion) & 0xFFFFFFFFn;
			imgOffset = (imgOffset - 0x581C3F6Dn) & 0xFFFFFFFFn;
			let s = imgOffset & 0x1Fn;
			imgOffset = (((imgOffset << s) & 0xFFFFFFFFn) | (imgOffset >> (32n - s))) & 0xFFFFFFFFn;
			imgOffset = (imgOffset ^ BigInt(hash)) & 0xFFFFFFFFn;
			imgOffset = (imgOffset + 120n) & 0xFFFFFFFFn;
			return Number(imgOffset);
		},
		/**
			string
		*/
		readStringAt: function(offset){
			let oldPos = curWzData.pos;
			curWzData.pos = offset;
			let str = this.readWzString();
			//stringTable[offset] = str;
			curWzData.pos = oldPos;
			return str;
		},
		readStringByOffset: function(offset){
			let b = this.readInt8();
            switch (b)
            {
                case 0x00:
                case 0x73:
                    return this.readWzString();

                case 0x01:
                case 0x1B:
                    return this.readStringAt(offset + Number(this.readInt32()));

                case 0x04:
                    curWzData.pos += 8;
                    break;

                default:
                    console.log("读取字符串错误 在:" + curWzName + " " + curWzData.pos);
            }
            return "";
		},
		readStringAscii: function(len){
			let arr = this.readByte(len);
			return String.fromCodePoint(...arr);
		},
		readStringU8Arr: function(u8Arr){
			return String.fromCodePoint(...u8Arr);
		},
		readStringU16Arr: function(u8Arr){
			let u16Arr = [];
			for(let i = 0; i < u8Arr.length; i+= 2){
				let d = u8Arr[i] + (u8Arr[i + 1] << 8);
				u16Arr.push(d);
			}
			return String.fromCodePoint(...u16Arr)
		},
		/**
			wz type
		*/
		readWzString: function(){
			let len = this.readInt8();
			return this.readWzStringByLen(len);
		},
		readWzStringByLen: function(len){
			if(len == 0){
				return "";
			}
			let l = 0, arr, res, str;
			if(len > 0 && len <= 127){
				if(len < 127){
					l = BigInt(len);
				}else{
					l = this.readInt32();
				}
				arr = this.readByte(l * 2n);
				WzCrypto.xorAAAA(arr);
				str = this.readStringU16Arr(arr);
			}else{
				if(len == 128){
					l = this.readInt32();
				}else{
					l = 256 - len;
				}
				arr = this.readByte(l);
				WzCrypto.xorAA(arr);
				str = this.readStringU8Arr(arr);
			}
			return str;
		},
		readWzInt64: function(){
			let len = this.readInt8();
			if(len == 128){
				return this.readInt64();
			}
			return len < 128? len: len - 256;
		},
		readWzInt32: function(){
			let len = this.readInt8();
			if(len == 128){
				return this.readInt32();
			}
			return len < 128? len: len - 256;
		},
		readWzInt16: function(){
			let len = this.readInt8();
			if(len == 128){
				return this.readInt16();
			}
			return len < 128? len: len - 256;
		},
		readWzInt8: function(){
			let len = this.readInt8();
			return len < 128? len: len - 256;
		},
		readWzFloat32: function(){
			let len = this.readInt8();
			if(len == 128){
				return this.readFloat32();
			}
			return len < 128? len: len - 256;
		},
		/**
			file stream flow
		*/
		readByte: function(len){
			if(curWzName == undefined){
				console.log("The wz file has not been read yet.");
				return;
			}
			let l = Number(len);
			if(l < 1){
				console.log(`len: ${len}, offset: ${curWzData.pos}`);
				return ;
			}
			const data = curWzData.data;
			let m = data.length;
			let n = data[0].length;
			let res = [];
			let i = Math.floor(curWzData.pos / n),j = curWzData.pos - i * n;
			for(; i < m; i++){
				for(; j < data[i].length; j++){
					if(l == 0)break;
					l--;
					curWzData.pos++;
					res.push(data[i][j]);
				}
				j = 0;
				if(l == 0)break;
			}
			return res;
		},
		readInt64: function(){
			return this.readInt(8);
		},
		readInt32: function(){
			return Number(this.readInt(4));
		},
		readInt16: function(){
			return Number(this.readInt(2));
		},
		readInt8: function(){
			return Number(this.readByte(1)[0]);
		},
		readInt: function(len){
			let arr = this.readByte(len);
			let res = BigInt(arr[0]);
			for(let i = 1; i < arr.length; i++){
				res += BigInt(arr[i] << (i * 8));
			}
			return res;
		},
		readFloat64: function(){
			let arr = this.readByte(8);
			let intValue = 0n;
			for(let i = 0; i < 8; i++){
				intValue |= (BigInt(arr[i]) << (56n - BigInt(i * 8)));
			} 
			const buffer = new ArrayBuffer(8);  
			const view = new DataView(buffer);  
			view.setBigUint64(0, intValue, true);// true小端
			return view.getFloat64(0).toFixed(2);  
		},
		readFloat32:function(){
			let arr = this.readByte(4);
			let intValue = 0n;
			for(let i = 0; i < 4; i++){
				intValue |= (BigInt(arr[i]) << (24n - BigInt(i * 8)));
			} 
			const buffer = new ArrayBuffer(4);  
			const view = new DataView(buffer);  
			view.setUint32(0, Number(intValue), true);// true小端
			return view.getFloat32(0).toFixed(2);  
			
		},
		/**
			wz file operate
		*/
		initData: function(name, handleFile){
			let _this = this;
			if(!wzDataMap){
				wzDataMap = {};
			}
			return new Promise((resolve, reject) => {
				// 加载wz
				if(name && wzDataMap[name]){
					_this.setCurWzData(name);
					_this.getHeader();
					resolve(1);
					return;
				}
				const start = Date.now();
				const promise = this.readFile(handleFile);
				promise.then((res)=>{
					console.log(`initData name:${name}, res: ${res}, time: ${(Date.now() - start)} ms`);
					_this.setCurWzData(name);
					_this.getHeader();
					resolve(2);
				});
			});
			
		},
		destroy:function(){
			wzDataMap = null;
		},
		getHeader: function(){
			curWzData.pos = 0;
			let signature = this.readStringAscii(4);
			if(signature !== 'PKG1'){
				console.log('This is not header of wz file.');
				return;
			}
			let dataSize = this.readInt64();
			let headerSize = this.readInt32();
			let copyright = this.readStringAscii(headerSize - curWzData.pos);
			this.readByte(2);//C2 00
			HASH_VERSION = this.calVersion();
			let headerData = {
				signature: signature,
				dataSize: dataSize,
				headerSize: headerSize,
				copyright: copyright,
			};
			curWzData.headerData = headerData;
			let dir = {}, img = {};
			curWzData.dir = dir;
			curWzData.img = img;
			this.getDirList(dir, img, curWzName, headerData.headerSize + 2); 
			//console.log(headerData);
		},
		getDirList(dir, img, wzName, pos){
			let wzIndex = wzName.indexOf("/");
			if(wzIndex > -1){
				wzName = wzName.substr(0, wzIndex);
			}
			this.setCurWzData(wzName);
			let headerData = curWzData.headerData;
			curWzData.pos = pos;
			let subCount = this.readWzInt32();// 62
			for(let i = 0; i < subCount; i++){
				let type = this.readInt8();
				let dirName;
				switch(type){
					case 0x02:
						dirName = this.readStringAt(Number(headerData.headerSize) + 1 + Number(this.readInt32()));
					case 0x03:
					case 0x04:
						if(dirName == undefined){
							dirName = this.readWzString();
						}
						let imgSize = this.readWzInt32();
						let checkSumSize = this.readWzInt32();
						let imgOffset = curWzData.pos - Number(headerData.headerSize);
						let hashOffset = this.readInt32();
						let offset = this.calOffset(imgOffset, hashOffset);
						if(dirName.endsWith(".img")){
							img[dirName] = {
								name: dirName,
								size: imgSize,
								checkSumSize: checkSumSize,
								offset: offset,
							};
						}else{
							dir[dirName] = {
								name: dirName,
								size: imgSize,
								checkSumSize: checkSumSize,
								offset: offset,
							};
						}
						
						break;
					default:
						console.log("没有满足条件的类型");
				}
			}
		},
		// Base.wz/Etc
		getDir: function(name){
			let _this = this;
			return new Promise((resolve, reject) => {
				let idx = name.lastIndexOf("/");
				if(idx == -1){
					console.log(`This is not subdir. ${name}`);
					reject();
					return;
				}
				let wzName = name.substr(0, name.indexOf("/"));
				this.setCurWzData(wzName);
				let preName = name.substr(0, idx);
				let sufName = name.substr(idx + 1);
					let data = _this.getLayerDataMap(preName)["dir"][sufName];
					let offset = data.offset;
					let dir = {}, img = {};
					data.dir = dir;
					data.img = img;
					_this.getDirList(dir, img, name, offset);
					resolve(1);
			});
			
		},
		// Base.wz/smap.img
		getImg: function(name){
			return new Promise((resolve, reject) => {
				let idx = name.lastIndexOf("/");
				if(idx == -1){
					console.log("不是img文件", name);
					reject();
					return;
				}
				let wzName = name.substr(0, name.indexOf("/"));
				this.setCurWzData(wzName);
				let preName = name.substr(0, idx);
				let sufName = name.substr(idx + 1);
				let _this = this;
				const data = _this.getLayerDataMap(preName)["img"][sufName];
				if(data == undefined || data.size == undefined || !data.name.endsWith(".img")){
					reject();
					return;
				}
				//console.log(data,wzData);
				// 保存原先的位置
				let pos = curWzData.pos;
				let n = BigInt(curWzData.data[0].length);
				// 跳转到指定位置读取
				curWzData.pos = data.offset;
				let ppos = curWzData.pos;
				const type = _this.readInt8();// 73
				switch(type){
					case 0x01:// lua img : 01 XX 00 00 00 00 00 OFFSET
						_this.readInt32();
						_this.readInt16();
						break;
					case 0x73:// img without offset
					case 0x1B:
						curWzData.pos = ppos;
						data.props = [];
						_this.extractImg(wzName, ppos, data.props, 0);
						break;
				}
				// 还原
				curWzData.pos = pos;
				resolve(1);
				return;
			});
		},
		extractImg:function(wzName, offset, parentNode, eob){
			this.setCurWzData(wzName);
			let entries;
			let prop = this.readStringByOffset(offset);
			//console.log(wzDataMap[curWzName].pos, offset, prop);
			switch(prop){
				case "Property":
					let val = this.readInt16();//跳过 00 00
					entries = this.readWzInt32();// 06
					//console.log("Property entries",wzDataMap[curWzName].pos,entries);
					parentNode.count = entries;
					for(let i = 0; i < entries; i++){
						let children = {};
						parentNode.push(children);
						this.extractValue(wzName, offset, children);
					}
					break;
				case "Shape2D#Vector2D":
					//new Wz_Vector(this.WzFile.ReadInt32(), this.WzFile.ReadInt32());
					parentNode.value = {x: this.readWzInt32(), y: this.readWzInt32()};
					parentNode.type = "WzVector";
					break;
				case "Canvas":
					curWzData.pos++;
					let t = this.readInt8();
					if(t == 0x01){
						curWzData.pos+=2;
						entries = this.readWzInt32();
						//console.log("Canvas entries", wzDataMap[curWzName].pos, entries);
						for (let i = 0; i < entries; i++){
							let children = [];
							parentNode.push(children);
							this.extractValue(wzName, offset, children);
						}
					}
					let w = this.readWzInt32();
					let h = this.readWzInt32();
					let format = this.readWzInt32() + this.readInt8();
					curWzData.pos+=4;
					let bufSize = Number(this.readInt32());
					let offs = curWzData.pos + 1;
					parentNode.value = {width: w, height: h,format: format, bufSize: bufSize - 1, offset: offs };
					curWzData.pos += bufSize;
					pngMap[wzName+":"+offs] = parentNode.value;
					break;
				case "Shape2D#Convex2D":
					entries = this.readWzInt32();
					//console.log("Shape2D#Convex2D entries", wzDataMap[curWzName].pos, entries);
					for(let i = 0; i < entries; i++){
						let children = [];
						parentNode.push(children);
						this.extractImg(wzName, offset, children, 0);
					}
					break;
				case "Sound_DX8":
					wzDataMap[curWzName].pos++;
					let len = Number(this.readWzInt32());
					let ms = this.readWzInt32();
					let headerLen = eob - len - wzDataMap[curWzName].pos;
					let header = this.readByte(headerLen);
					parentNode.value = {offset: (eob - len), length: len, header: header, ms: ms};
					curWzData.pos = eob;
					soundMap[wzName+":"+(eob-len)] = parentNode.value;
					break;
				case "UOL":
					wzDataMap[curWzName].pos++;
					//new Wz_Uol(this.WzFile.ReadString(offset, this.EncKeys));
					parentNode.value = this.readStringByOffset(offset);
					parentNode.type = "WzUol";
					break;
				default:
					console.warn("不知道prop类型");
			}
		},
		extractValue: function(wzName, offset, parentNode){
			this.setCurWzData(wzName);
			let temp = {};
			temp.key = this.readStringByOffset(offset);//00 FF 31
			//console.log("parentStr",wzDataMap[curWzName].pos, offset, temp.key);
			let type = this.readInt8();//09
			//console.log("type",wzDataMap[curWzName].pos,type);
			switch(type){
				case 0x00:
                    temp.value = null;
					temp.type = "";
                    break;

                case 0x02:
                case 0x0B:
                    temp.value = this.readInt16();
					temp.type = "Int16";
                    break;

                case 0x03:
                case 0x13:
               // case 0x14:
                    temp.value = this.readWzInt32();
					temp.type = "WzInt32";
                    break;

                case 0x14:
                    temp.value = this.readWzInt64();
					temp.type = "WzInt64";
                    break;

                case 0x04:
                    temp.value = this.readWzFloat32();
					temp.type = "WzFloat32";
                    break;

                case 0x05:
                    temp.value = this.readFloat64();
					temp.type = "Float64";
                    break;

                case 0x08:
                    temp.value = this.readStringByOffset(offset);
					temp.type = "String";
                    break;

                case 0x09:
					parentNode.children = [];
					let eob = this.readInt32() + curWzData.pos;
                    this.extractImg(wzName, offset, parentNode.children, eob);
                    break;

                default:
                   throw new Error("读取值错误." + type + " at Offset: " + wzDataMap[curWzName].pos);
			}
			parentNode.key = temp.key;
			parentNode.value = temp.value;
			parentNode.type = temp.type;
			//console.log("temp",temp);
		},
	};
})();
const WzSound = (function(){
	return {
		extractSound:function(wzName, offset){
			WzFile.setCurWzData(wzName);
			let curWzData = WzFile.getCurWzData();
			let sound = WzFile.getSoundMap(offset);
			if(!offset || !sound || 
				!sound.header || 
				sound.header.length <= 51){
				console.log("The sound data is invaild!");
				return;
			}
			this.tryDecryptHeader(offset);
			this.trySoundType(offset);
			curWzData.pos = offset;
			switch(sound.type){
				case "Mp3":
					sound.data = WzFile.readByte(sound.length);
					break;
				case "WavRaw":
					console.log("WavRaw: Waiting for development！");
					break;
			}
		},
		trySoundType:function(offset){
			let sound = WzFile.getSoundMap(offset);
			if(sound.header == undefined){
				sound.type = "Mp3";
			}else{
				switch(sound.header.length){
					default:
					case 0x52:
						sound.type = "Mp3";
						break;
					case 0x46:
						if(this.getFrequency(offset) == sound.length && sound.ms == 1000){
							sound.type = "Binary";
						}else{
							sound.type = "WavRaw";
						}
						break;
				}
			}
		},
		getFrequency:function(offset){
			let sound = WzFile.getSoundMap(offset);
			if(sound.header == undefined || sound.header.length < 0x3c){
				return 0;
			}
			let ans = 0;
			for(let i = 56; i < 59; i++){
				ans = ((ans + sound.header[i]) << 8);
			}
			ans += sound.header[59];
			return ans;
		},
		tryDecryptHeader:function(offset){
			let sound = WzFile.getSoundMap(offset);
			let waveFormatLen = sound.header[51];
			if(sound.header.length != 52 + waveFormatLen){
				console.log("The sound data length is error!");
				return ;
			}
			let cbSize = (sound.header[69] << 8) + sound.header[68];
			if(cbSize + 18 != waveFormatLen){
				let tempHeader = [];
				for(let i = 0; i < waveFormatLen; i++){
					tempHeader.push(sound.header[i + 52]);
				}
				this.ensureSize(waveFormatLen);
				const cipherMask = WzCrypto.getCipherMask();
				for(let i = 0; i < waveFormatLen; i++){
					tempHeader[i] ^= cipherMask[i];
				}
				cbSize = (tempHeader[17] << 8) + tempHeader[16];
				if(cbSize + 18 == waveFormatLen){
					for(let i = 0; i < waveFormatLen; i++){
						sound.header[i + 52] = tempHeader[i];
					}
				}
			}
		},
		playSound:function(wzName, offset){
			WzFile.setCurWzData(wzName);
			let sound = WzFile.getSoundMap(offset);
			const typedArray = new Uint8Array(sound.data);
			const blob = new Blob([typedArray.buffer], { type: 'audio/mpeg' });  
			const url = URL.createObjectURL(blob);  
			const audioPlayer = document.getElementById('audioPlayer');
			audioPlayer.src = url;
			audioPlayer.play().catch(error => {
				console.error('Error playing audio:', error);
			});
			// 清理工作：在不再需要URL时释放它，避免内存泄漏
			audioPlayer.addEventListener('ended', () => {
				URL.revokeObjectURL(url);
			});
		},
	};
})();
const WzPng = (function(){
	
	return {
		getImgRawData:function(wzName, offset){
			WzFile.setCurWzData(wzName);
			let png = WzFile.getPngMap(offset);
			if(!offset || !png){
				return;
			}
			let curWzData = WzFile.getCurWzData();
			curWzData.pos = offset;
			let type = WzFile.readInt16();
			let inflator;
			if(type == 0x9C78){
				let arr = WzFile.readByte(png.bufSize - 2);
				arr.unshift(0x9C);arr.unshift(0x78);
				inflator = new pako.Inflate();
				inflator.push(new Uint8Array(arr));
			}else{
				curWzData.pos-=2;
				let arr = [];
				let endPosition = png.bufSize + curWzData.pos;
				while(curWzData.pos < endPosition){
					let blockSize = Number(WzFile.readInt32());
					if(curWzData.pos + blockSize > endPosition){
						throw new Error(`Wz_Png exceeds the declared data size. (data length: ${imgData.bufSize}, readed bytes: ${startIndex}, next block: ${blockSize})`);
					}
					let tArr = WzFile.readByte(blockSize);
					WzCrypto.decrypt(tArr);
					Array.prototype.push.apply(arr, tArr);
				}

				inflator = new pako.Inflate();
				inflator.push(new Uint8Array(arr));
			}
			
			//console.log(inflator);
			let code = inflator.chunks.push(inflator.strm.output);
			let outArr = inflator.result;
			/*let size = inflator.strm.total_out;
			let outArr = new Uint8Array(size);
			let i = 0, k = 0;
			for(; i < inflator.chunks.length; i++){
				for(let j = 0; j < inflator.chunks[i].length; j++){
					if(k == size)break;
					outArr[k] = inflator.chunks[i][j];
					k++;
				}
			}*/
			//格式
			let res;
			switch(png.format){
				case 1:
					res = this.getPixelDataBgra4444(outArr);
					break;
				case 3:
					res = this.getPixelDataForm3(outArr, width, height);
					break;
			}
			if(res){
				png.data = res;
			}
			//this.displayImageOnCanvas(res, Number(png.width), Number(png.height));
				
		},
		showImgByRawData:function(u8Arr){
			let blob = new Blob([u8Arr], {type: "image/png"}); 
			
			let reader = new FileReader();
			reader.onload = function(e) {
				let imgElement = document.querySelector("#wzPng");
				imgElement.src = e.target.result;
			};
			reader.readAsDataURL(blob);
		},
		displayImageOnCanvas: function(wzName, offset) {
			WzFile.setCurWzData(wzName);
			let png = WzFile.getPngMap(offset);
			let argb8888Data = png.data;
			let width = Number(png.width), height = Number(png.height);
			const canvas = document.getElementById('myCanvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			const imageData = ctx.createImageData(width, height);
			for (let i = 0, j = 0; i < argb8888Data.length; i += 4, j += 4) {
				imageData.data[j + 3] = argb8888Data[i + 3]; 
				imageData.data[j + 0] = argb8888Data[i + 2]; 
				imageData.data[j + 1] = argb8888Data[i + 1]; 
				imageData.data[j + 2] = argb8888Data[i + 0]; 
			}

			ctx.putImageData(imageData, 0, 0, 0, 0, width, height);
		},
		//png format
		getPixelDataBgra4444:function(u8Arr){
			let u8argb = new Uint8Array(u8Arr.length * 2);
			let p;
			for(let i = 0; i < u8Arr.length; i++){
				p = u8Arr[i] & 0x0F; p |= (p << 4); u8argb[i * 2] = (p & 0xFF);
				p = u8Arr[i] & 0xF0; p |= (p >> 4); u8argb[i * 2 + 1] = (p & 0xFF);
			}
			return u8argb;
		},
		getPixelDataForm3:function(rawData, width, height){
			let pixel = new Uint8Array(rawData.length * 4);
			let w = Math.ceil(width / 4);
			let h = Math.ceil(height / 4);
			for(let y = 0; y < 0; y++){
				for(let x = 0; x < w; x++){
					let index = (x + y * w) * 2; //原像素索引
					let index2 = x * 4 + y * width * 4; //目标像素索引
					let p = (rawData[index] & 0x0F) | ((rawData[index] & 0x0F) << 4)
						| ((rawData[index] & 0xF0) | ((rawData[index] & 0xF0) >> 4)) << 8
						| ((rawData[index + 1] & 0x0F) | ((rawData[index + 1] & 0x0F) << 4)) << 16
						| ((rawData[index + 1] & 0xF0) | ((rawData[index + 1] & 0xF0) >> 4)) << 24;
				
					for (let i = 0; i < 4; i++){
						if (x * 4 + i < width)
						{
							pixel[index2 + i] = p;
						}
						else
						{
							break;
						}
					}
				}
				//复制行
				let srcIndex = y * width * 4 * 4;
				let dstIndex = srcIndex + width * 4;
				for (let j = 1; j < 4; j++)
				{
					if (y * 4 + j < height)
					{
						for(let u = 0; u < width * 4; u++){
							
							pixel[dstIndex + u] = pixel[srcIndex + u];
						}
						dstIndex += width * 4;
					}
					else
					{
						break;
					}
				}
			}
			return pixel;
		},
	};
})();