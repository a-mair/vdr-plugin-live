/*
 * This is part of the live VDR plugin. See COPYING for license information.
 *
 * This javascript file is included in ALL live pages using
 *    <& pageelems.scripts &>
 * so every page can rely on availability of these functions
 *
 * In this file we place javascript functions if
 * - several (2 or more) pages need this javascript function
 * - No dependencies on information only available in C++ (like texts, ...)
 */

// save the scroll position of an element
function saveScrollPosition(id) {
  let element = document.getElementById(id);
  if (element) {
    let left = element.scrollLeft;
    let top  = element.scrollTop;
    if (left || top) {
      history.replaceState({ id: element.id, scrollLeft: left, scrollTop:  top }, "");
    }
  }
}

// restore a previously saved scroll position of an element
function restoreScrollPosition() {
  if (history.state) {
    let element = document.getElementById(history.state.id);
    let left = history.state.scrollLeft;
    let top  = history.state.scrollTop;
    if (element && (top || left)) {
      element.scrollTo(left, top);
    }
  }
}

// used in every treeview (recordings, recording commands)
function set_icons_closed(img_plus_minus, img_folder_symbol) {
// input: images nodes
// -> set the images to the closed state, indicating the folder is currently closed

  if (img_plus_minus) img_plus_minus.src=getThemedLinkPrefixImg()+"icon_overlay_plus.svg";
  if (img_folder_symbol) img_folder_symbol.src=getThemedLinkPrefixImg()+"folder_closed.svg";
}
function set_icons_open(img_plus_minus, img_folder_symbol) {
// input: images nodes
// -> set the images to the open state, indicating the folder is currently open

  if (img_plus_minus) img_plus_minus.src=getThemedLinkPrefixImg()+"icon_overlay_minus.svg";
  if (img_folder_symbol) img_folder_symbol.src=getThemedLinkPrefixImg()+"folder_open.svg";
}

// in pages/edit_timer.ecpp, pages/recordings.ecpp, pages/edit_recording.ecpp
// used in the folder selection dropdown / inputfield
function new_dir() {
    document.getElementById("dirSelection").style.display = "none";
    document.getElementById("dirEntry").style.display = "";
    const dir = document.getElementById("directory");
    const newdir = document.getElementById("newdir");
    newdir.value = dir.value;
    newdir.disabled = false;
}

// navigate depending on referrer
function back_depending_referrer(back_epginfo, back_others) {
  if (document.referrer.indexOf("epginfo.html?") != -1) {
    history.go(-back_epginfo);
  } else {
    history.go(-back_others);
  }
}
// defer image load
function imgLoad() {
var imgDefer = document.getElementsByTagName('img');
  for (var i = 0; i < imgDefer.length; i++) {
    if (imgDefer[i].getAttribute('data-src')) {
      imgDefer[i].setAttribute('src',imgDefer[i].getAttribute('data-src'));
    }
  }
}


