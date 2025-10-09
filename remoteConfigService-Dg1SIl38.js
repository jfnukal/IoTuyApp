var P=Object.defineProperty;var O=(i,t,e)=>t in i?P(i,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):i[t]=e;var S=(i,t,e)=>O(i,typeof t!="symbol"?t+"":t,e);import{g as N,a as _,_ as D,F as R,b as z,C as K,r as b,E as B,i as U,L as $,c as k,S as j,d as V,e as x}from"./index-DEHk1orS.js";const F="@firebase/remote-config",I="0.4.9";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class H{constructor(){this.listeners=[]}addEventListener(t){this.listeners.push(t)}abort(){this.listeners.forEach(t=>t())}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const y="remote-config";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const W={"registration-window":"Undefined window object. This SDK only supports usage in a browser environment.","registration-project-id":"Undefined project identifier. Check Firebase app initialization.","registration-api-key":"Undefined API key. Check Firebase app initialization.","registration-app-id":"Undefined app identifier. Check Firebase app initialization.","storage-open":"Error thrown when opening storage. Original error: {$originalErrorMessage}.","storage-get":"Error thrown when reading from storage. Original error: {$originalErrorMessage}.","storage-set":"Error thrown when writing to storage. Original error: {$originalErrorMessage}.","storage-delete":"Error thrown when deleting from storage. Original error: {$originalErrorMessage}.","fetch-client-network":"Fetch client failed to connect to a network. Check Internet connection. Original error: {$originalErrorMessage}.","fetch-timeout":'The config fetch request timed out.  Configure timeout using "fetchTimeoutMillis" SDK setting.',"fetch-throttle":'The config fetch request timed out while in an exponential backoff state. Configure timeout using "fetchTimeoutMillis" SDK setting. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.',"fetch-client-parse":"Fetch client could not parse response. Original error: {$originalErrorMessage}.","fetch-status":"Fetch server returned an HTTP error status. HTTP status: {$httpStatus}.","indexed-db-unavailable":"Indexed DB is not supported by current browser"},l=new B("remoteconfig","Remote Config",W);function Y(i,t){return i instanceof R&&i.code.indexOf(t)!==-1}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const G=!1,J="",L=0,q=["1","true","t","yes","y","on"];class T{constructor(t,e=J){this._source=t,this._value=e}asString(){return this._value}asBoolean(){return this._source==="static"?G:q.indexOf(this._value.toLowerCase())>=0}asNumber(){if(this._source==="static")return L;let t=Number(this._value);return isNaN(t)&&(t=L),t}getSource(){return this._source}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function X(i=N()){return i=_(i),D(i,y).getImmediate()}async function Q(i){const t=_(i),[e,s]=await Promise.all([t._storage.getLastSuccessfulFetchResponse(),t._storage.getActiveConfigEtag()]);return!e||!e.config||!e.eTag||e.eTag===s?!1:(await Promise.all([t._storageCache.setActiveConfig(e.config),t._storage.setActiveConfigEtag(e.eTag)]),!0)}function Z(i){const t=_(i);return t._initializePromise||(t._initializePromise=t._storageCache.loadFromStorage().then(()=>{t._isInitializationComplete=!0})),t._initializePromise}async function tt(i){const t=_(i),e=new H;setTimeout(async()=>{e.abort()},t.settings.fetchTimeoutMillis);try{await t._client.fetch({cacheMaxAgeMillis:t.settings.minimumFetchIntervalMillis,signal:e}),await t._storageCache.setLastFetchStatus("success")}catch(s){const a=Y(s,"fetch-throttle")?"throttle":"failure";throw await t._storageCache.setLastFetchStatus(a),s}}function w(i,t){const e=_(i);e._isInitializationComplete||e._logger.debug(`A value was requested for key "${t}" before SDK initialization completed. Await on ensureInitialized if the intent was to get a previously activated value.`);const s=e._storageCache.getActiveConfig();return s&&s[t]!==void 0?new T("remote",s[t]):e.defaultConfig&&e.defaultConfig[t]!==void 0?new T("default",String(e.defaultConfig[t])):(e._logger.debug(`Returning static value for key "${t}". Define a default or remote value if this is unintentional.`),new T("static"))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class et{constructor(t,e,s,a){this.client=t,this.storage=e,this.storageCache=s,this.logger=a}isCachedDataFresh(t,e){if(!e)return this.logger.debug("Config fetch cache check. Cache unpopulated."),!1;const s=Date.now()-e,a=s<=t;return this.logger.debug(`Config fetch cache check. Cache age millis: ${s}. Cache max age millis (minimumFetchIntervalMillis setting): ${t}. Is cache hit: ${a}.`),a}async fetch(t){const[e,s]=await Promise.all([this.storage.getLastSuccessfulFetchTimestampMillis(),this.storage.getLastSuccessfulFetchResponse()]);if(s&&this.isCachedDataFresh(t.cacheMaxAgeMillis,e))return s;t.eTag=s&&s.eTag;const a=await this.client.fetch(t),o=[this.storageCache.setLastSuccessfulFetchTimestampMillis(Date.now())];return a.status===200&&o.push(this.storage.setLastSuccessfulFetchResponse(a)),await Promise.all(o),a}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function st(i=navigator){return i.languages&&i.languages[0]||i.language}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class it{constructor(t,e,s,a,o,c){this.firebaseInstallations=t,this.sdkVersion=e,this.namespace=s,this.projectId=a,this.apiKey=o,this.appId=c}async fetch(t){const[e,s]=await Promise.all([this.firebaseInstallations.getId(),this.firebaseInstallations.getToken()]),o=`${window.FIREBASE_REMOTE_CONFIG_URL_BASE||"https://firebaseremoteconfig.googleapis.com"}/v1/projects/${this.projectId}/namespaces/${this.namespace}:fetch?key=${this.apiKey}`,c={"Content-Type":"application/json","Content-Encoding":"gzip","If-None-Match":t.eTag||"*"},h={sdk_version:this.sdkVersion,app_instance_id:e,app_instance_id_token:s,app_id:this.appId,language_code:st()},r={method:"POST",headers:c,body:JSON.stringify(h)},n=fetch(o,r),u=new Promise((g,m)=>{t.signal.addEventListener(()=>{const M=new Error("The operation was aborted.");M.name="AbortError",m(M)})});let d;try{await Promise.race([n,u]),d=await n}catch(g){let m="fetch-client-network";throw(g==null?void 0:g.name)==="AbortError"&&(m="fetch-timeout"),l.create(m,{originalErrorMessage:g==null?void 0:g.message})}let f=d.status;const A=d.headers.get("ETag")||void 0;let C,E;if(d.status===200){let g;try{g=await d.json()}catch(m){throw l.create("fetch-client-parse",{originalErrorMessage:m==null?void 0:m.message})}C=g.entries,E=g.state}if(E==="INSTANCE_STATE_UNSPECIFIED"?f=500:E==="NO_CHANGE"?f=304:(E==="NO_TEMPLATE"||E==="EMPTY_CONFIG")&&(C={}),f!==304&&f!==200)throw l.create("fetch-status",{httpStatus:f});return{status:f,eTag:A,config:C}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function at(i,t){return new Promise((e,s)=>{const a=Math.max(t-Date.now(),0),o=setTimeout(e,a);i.addEventListener(()=>{clearTimeout(o),s(l.create("fetch-throttle",{throttleEndTimeMillis:t}))})})}function ot(i){if(!(i instanceof R)||!i.customData)return!1;const t=Number(i.customData.httpStatus);return t===429||t===500||t===503||t===504}class rt{constructor(t,e){this.client=t,this.storage=e}async fetch(t){const e=await this.storage.getThrottleMetadata()||{backoffCount:0,throttleEndTimeMillis:Date.now()};return this.attemptFetch(t,e)}async attemptFetch(t,{throttleEndTimeMillis:e,backoffCount:s}){await at(t.signal,e);try{const a=await this.client.fetch(t);return await this.storage.deleteThrottleMetadata(),a}catch(a){if(!ot(a))throw a;const o={throttleEndTimeMillis:Date.now()+V(s),backoffCount:s+1};return await this.storage.setThrottleMetadata(o),this.attemptFetch(t,o)}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nt=60*1e3,ct=12*60*60*1e3;class lt{constructor(t,e,s,a,o){this.app=t,this._client=e,this._storageCache=s,this._storage=a,this._logger=o,this._isInitializationComplete=!1,this.settings={fetchTimeoutMillis:nt,minimumFetchIntervalMillis:ct},this.defaultConfig={}}get fetchTimeMillis(){return this._storageCache.getLastSuccessfulFetchTimestampMillis()||-1}get lastFetchStatus(){return this._storageCache.getLastFetchStatus()||"no-fetch-yet"}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function v(i,t){const e=i.target.error||void 0;return l.create(t,{originalErrorMessage:e&&(e==null?void 0:e.message)})}const p="app_namespace_store",ht="firebase_remote_config",gt=1;function ut(){return new Promise((i,t)=>{try{const e=indexedDB.open(ht,gt);e.onerror=s=>{t(v(s,"storage-open"))},e.onsuccess=s=>{i(s.target.result)},e.onupgradeneeded=s=>{const a=s.target.result;switch(s.oldVersion){case 0:a.createObjectStore(p,{keyPath:"compositeKey"})}}}catch(e){t(l.create("storage-open",{originalErrorMessage:e==null?void 0:e.message}))}})}class ft{constructor(t,e,s,a=ut()){this.appId=t,this.appName=e,this.namespace=s,this.openDbPromise=a}getLastFetchStatus(){return this.get("last_fetch_status")}setLastFetchStatus(t){return this.set("last_fetch_status",t)}getLastSuccessfulFetchTimestampMillis(){return this.get("last_successful_fetch_timestamp_millis")}setLastSuccessfulFetchTimestampMillis(t){return this.set("last_successful_fetch_timestamp_millis",t)}getLastSuccessfulFetchResponse(){return this.get("last_successful_fetch_response")}setLastSuccessfulFetchResponse(t){return this.set("last_successful_fetch_response",t)}getActiveConfig(){return this.get("active_config")}setActiveConfig(t){return this.set("active_config",t)}getActiveConfigEtag(){return this.get("active_config_etag")}setActiveConfigEtag(t){return this.set("active_config_etag",t)}getThrottleMetadata(){return this.get("throttle_metadata")}setThrottleMetadata(t){return this.set("throttle_metadata",t)}deleteThrottleMetadata(){return this.delete("throttle_metadata")}async get(t){const e=await this.openDbPromise;return new Promise((s,a)=>{const c=e.transaction([p],"readonly").objectStore(p),h=this.createCompositeKey(t);try{const r=c.get(h);r.onerror=n=>{a(v(n,"storage-get"))},r.onsuccess=n=>{const u=n.target.result;s(u?u.value:void 0)}}catch(r){a(l.create("storage-get",{originalErrorMessage:r==null?void 0:r.message}))}})}async set(t,e){const s=await this.openDbPromise;return new Promise((a,o)=>{const h=s.transaction([p],"readwrite").objectStore(p),r=this.createCompositeKey(t);try{const n=h.put({compositeKey:r,value:e});n.onerror=u=>{o(v(u,"storage-set"))},n.onsuccess=()=>{a()}}catch(n){o(l.create("storage-set",{originalErrorMessage:n==null?void 0:n.message}))}})}async delete(t){const e=await this.openDbPromise;return new Promise((s,a)=>{const c=e.transaction([p],"readwrite").objectStore(p),h=this.createCompositeKey(t);try{const r=c.delete(h);r.onerror=n=>{a(v(n,"storage-delete"))},r.onsuccess=()=>{s()}}catch(r){a(l.create("storage-delete",{originalErrorMessage:r==null?void 0:r.message}))}})}createCompositeKey(t){return[this.appId,this.appName,this.namespace,t].join()}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mt{constructor(t){this.storage=t}getLastFetchStatus(){return this.lastFetchStatus}getLastSuccessfulFetchTimestampMillis(){return this.lastSuccessfulFetchTimestampMillis}getActiveConfig(){return this.activeConfig}async loadFromStorage(){const t=this.storage.getLastFetchStatus(),e=this.storage.getLastSuccessfulFetchTimestampMillis(),s=this.storage.getActiveConfig(),a=await t;a&&(this.lastFetchStatus=a);const o=await e;o&&(this.lastSuccessfulFetchTimestampMillis=o);const c=await s;c&&(this.activeConfig=c)}setLastFetchStatus(t){return this.lastFetchStatus=t,this.storage.setLastFetchStatus(t)}setLastSuccessfulFetchTimestampMillis(t){return this.lastSuccessfulFetchTimestampMillis=t,this.storage.setLastSuccessfulFetchTimestampMillis(t)}setActiveConfig(t){return this.activeConfig=t,this.storage.setActiveConfig(t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dt(){z(new K(y,i,"PUBLIC").setMultipleInstances(!0)),b(F,I),b(F,I,"esm2017");function i(t,{instanceIdentifier:e}){const s=t.getProvider("app").getImmediate(),a=t.getProvider("installations-internal").getImmediate();if(typeof window>"u")throw l.create("registration-window");if(!U())throw l.create("indexed-db-unavailable");const{projectId:o,apiKey:c,appId:h}=s.options;if(!o)throw l.create("registration-project-id");if(!c)throw l.create("registration-api-key");if(!h)throw l.create("registration-app-id");e=e||"firebase";const r=new ft(h,s.name,e),n=new mt(r),u=new $(F);u.logLevel=k.ERROR;const d=new it(a,j,e,o,c,h),f=new rt(d,r),A=new et(f,r,n,u),C=new lt(s,A,n,r,u);return Z(C),C}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function pt(i){return i=_(i),await tt(i),Q(i)}dt();class Ct{constructor(){S(this,"remoteConfig");S(this,"isInitialized",!1);S(this,"configCache",new Map);this.remoteConfig=X(x),this.remoteConfig.settings.minimumFetchIntervalMillis=36e5,this.remoteConfig.defaultConfig={WEATHER_API_KEY:"",UNSPLASH_ACCESS_KEY:"",BAKALARI_USERNAME:"",BAKALARI_PASSWORD:"",BAKALARI_SERVER:"",ALLOWED_EMAILS:"[]"}}async initialize(){if(this.isInitialized){console.log("🔧 Remote Config již byl inicializován");return}try{console.log("🔄 Načítám konfiguraci z Firebase Remote Config...");const t=await pt(this.remoteConfig);console.log(t?"✅ Remote Config byl úspěšně aktivován":"ℹ️ Používám cache Remote Config"),this.isInitialized=!0,this.preloadCache()}catch(t){console.error("❌ Chyba při načítání Remote Config:",t),console.warn("⚠️ Používám výchozí hodnoty (fallback)"),this.isInitialized=!0}}preloadCache(){["WEATHER_API_KEY","UNSPLASH_ACCESS_KEY","BAKALARI_USERNAME","BAKALARI_PASSWORD","BAKALARI_SERVER","ALLOWED_EMAILS"].forEach(e=>{try{const s=w(this.remoteConfig,e);this.configCache.set(e,s.asString())}catch{console.warn(`⚠️ Nepodařilo se načíst klíč: ${e}`)}}),console.log(`✅ Načteno ${this.configCache.size} parametrů do cache`)}getString(t){if(!this.isInitialized)return console.warn("⚠️ Remote Config ještě není inicializován"),"";if(this.configCache.has(t))return this.configCache.get(t);try{const s=w(this.remoteConfig,t).asString();return this.configCache.set(t,s),s}catch(e){return console.error(`❌ Chyba při získávání klíče "${t}":`,e),""}}getNumber(t){if(!this.isInitialized)return console.warn("⚠️ Remote Config ještě není inicializován"),0;try{return w(this.remoteConfig,t).asNumber()}catch(e){return console.error(`❌ Chyba při získávání čísla "${t}":`,e),0}}getBoolean(t){if(!this.isInitialized)return console.warn("⚠️ Remote Config ještě není inicializován"),!1;try{return w(this.remoteConfig,t).asBoolean()}catch(e){return console.error(`❌ Chyba při získávání boolean "${t}":`,e),!1}}getJSON(t){const e=this.getString(t);if(!e)return null;try{return JSON.parse(e)}catch(s){return console.error(`❌ Chyba při parsování JSON z klíče "${t}":`,s),null}}isEmailAllowed(t){const e=this.getJSON("ALLOWED_EMAILS");return!e||!Array.isArray(e)?(console.warn("⚠️ ALLOWED_EMAILS není správně nastaven"),!1):e.includes(t.toLowerCase())}clearCache(){this.configCache.clear(),console.log("🗑️ Cache Remote Config vymazána")}getAllValues(){const t={};return this.configCache.forEach((e,s)=>{s.includes("PASSWORD")||s.includes("KEY")?t[s]="***HIDDEN***":t[s]=e}),t}}const St=new Ct;export{St as remoteConfigService};
