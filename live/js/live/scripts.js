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
