var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/devtools/Console.jsm")

if (typeof ExportScrapbookToWiz === 'undefined') {
  var ExportScrapbookToWiz = {};
}

ExportScrapbookToWiz = {
  debug: false,

  mainWindow: window.QueryInterface(Ci.nsIInterfaceRequestor)
    .getInterface(Ci.nsIWebNavigation)
    .QueryInterface(Ci.nsIDocShellTreeItem)
    .rootTreeItem
    .QueryInterface(Ci.nsIInterfaceRequestor)
    .getInterface(Ci.nsIDOMWindow),

  get prefs() {
      delete this.prefs;
      return this.prefs = Cc["@mozilla.org/preferences-service;1"]
                      .getService(Ci.nsIPrefService)
                      .getBranch("extensions.exportscrapbooktowiz.");
  },

  export: function() {
    var aRes = sbTreeUI.resource;
    if (!aRes)
      return;

    this.debug = this.prefs.getBoolPref('debug');

    var id = ScrapBookData.getProperty(aRes, "id"),
      type = ScrapBookData.getProperty(aRes, "type"),
      title = ScrapBookData.getProperty(aRes, "title"),
      url = ScrapBookData.getProperty(aRes, "source");

    // 当 type 为 site 时，有多个 html，会有问题

    var aFolder = ScrapBookUtils.getContentDir(id),
      indexPath = aFolder.path + '\\index.html',
      preUrl = url.replace(/[^\/]*$/, '');

    var contentConfig = "[Common]\r\nURL=" + url +
      "\r\nTitle=" + title +
      "\r\nFileNameAll=" + indexPath +
      "\r\nFileNameSel=" + indexPath +
      "\r\n[Resources]";

    var resourceFilesIndex = 0;

    // 罗列该目录下的所有文件
    let files = aFolder.directoryEntries.QueryInterface(Ci.nsISimpleEnumerator);
    while (files.hasMoreElements()) {
      let file = files.getNext().QueryInterface(Ci.nsIFile),
        filename = file.leafName;
      if (filename == 'index.html' || filename == 'index.dat' || filename.endsWith('.ttf'))
        continue;

      contentConfig += "\r\n" + resourceFilesIndex + "_URL=" + preUrl + filename;
      contentConfig += "\r\n" + resourceFilesIndex + "_File=" + file.path;
      resourceFilesIndex += 1;
    }

    contentConfig += "\r\nCount=" + resourceFilesIndex;

    if (this.debug) {
      console.log('type is ', type);
      console.log('contentConfig is ', contentConfig);
    }

    this.launchWiz(contentConfig);
  },
  launchWiz: function(contentConfig) {
    var wiz_km_writeFileWithCharset = this.mainWindow.wiz_km_writeFileWithCharset,
      wiz_km_getWizAppPath = this.mainWindow.wiz_km_getWizAppPath,
      wiz_km_unicodeToBytes = this.mainWindow.wiz_km_unicodeToBytes,
      wiz_km_base64Encode = this.mainWindow.wiz_km_base64Encode,
      wiz_km_runExeFile = this.mainWindow.wiz_km_runExeFile;

    var tmpDir = Cc["@mozilla.org/file/directory_service;1"]
      .getService(Ci.nsIProperties)
      .get("TmpD", Ci.nsIFile);

    var fileNameConfig = tmpDir.clone();
    fileNameConfig.append("wiz_km_firefox.ini");

    wiz_km_writeFileWithCharset(fileNameConfig, contentConfig, "utf-8");

    var fileNameExe = wiz_km_getWizAppPath() + "Wiz.exe";

    var exeFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    exeFile.initWithPath(fileNameExe);

    var dllFileName = wiz_km_getWizAppPath() + "NPWizWebCapture.dll";
    var functionName = "WizKMResourceToDocument";

    var params = fileNameConfig.path;
    params = wiz_km_unicodeToBytes(params, "utf-8");
    params = wiz_km_base64Encode(params);
    params = "/FileName=" + params;
    params = params.replace(/\r/gi, "");
    params = params.replace(/\n/gi, "");

    var firefoxType = "/firefox=1";

    var cmdLineExe = [dllFileName, functionName, params, firefoxType];

    wiz_km_runExeFile(exeFile, cmdLineExe, false);
  },

  onload: function() {
    var DATA = [
      ['sbPopupOpen', 'o'],
      ['sbPopupOpenNewTab', 't'],
      ['sbPopupOpenSource', 's'],

      ['sbPopupTools', 'e'],
      ['sbPopupShowFiles', 'f'],
      ['sbPopupSend', 'm'],
      ['sbPopupExport', 'e'],

      ['sbPopupRemove', 'd'],
      ['sbPopupNewFolder', 'f'],
      ['sbPopupNewNote', 'n'],
      ['sbPopupProperty', 'p'],
    ];

    DATA.forEach(function(info){
      var menuitem = document.getElementById(info[0]);
      if (menuitem) {
        menuitem.setAttribute('accesskey', info[1]);
      }
    });
  },
};

window.addEventListener('load', function(){
  ExportScrapbookToWiz.onload();
}, false);