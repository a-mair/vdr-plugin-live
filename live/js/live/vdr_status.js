/*
 * This is part of the live VDR plugin. See COPYING for license information.
 *
 * Javascript functions for the status update box.
 * This file needs mootools.js to be included on the pages.
 */

class LiveVdrInfo {

    constructor(url, boxId, tooltipStopUpdate, tooltipStartUpdate)
    {
      this.url = url;
      this.boxId = boxId;
      this.reload = true;
      this.timer = null;
      this.tooltipStopUpdate = tooltipStopUpdate;
      this.tooltipStartUpdate = tooltipStartUpdate;
    }

    async request(update)
    {
      var response;
      if (update)
        response = await fetch(this.url+'?update=1');
      else
        response = await fetch(this.url+'?update=0');
      const text = await response.text();
      if (!text || text == '') {
        this.reportError(true);
        return;
      }
      const xmldoc = new window.DOMParser().parseFromString(text, "text/xml");
      if (!xmldoc || xmldoc == '') {
        this.reportError(true);
        return;
      }
      this.showInfo(text, xmldoc);
    }

    showInfo(text, xmldoc)
    {
      try {
        this.selectInfoElems(xmldoc);

        this.setEpgInfo(xmldoc);

        this.setInfoMessage(xmldoc);

        this.setUpdate(xmldoc);
      }
      catch (e) {
        this.reportError(null);
      }
    }

    reportError(transport)
    {
      this.setTextContent('caption', 'ERROR');
      var message;
      if (transport != null) {
        message = $("__infobox_request_err").firstChild.nodeValue;
      }
      else {
        message = $("__infobox_update_err").firstChild.nodeValue;
      }
      this.setTextContent('name', message);
    }

    // private function to switch visibility of controls.
    selectInfoElems(xmldoc)
    {
      var infoType = xmldoc.getElementsByTagName('type').item(0);

      var channel = $(this.boxId + '_channel_buttons');
      var playback = $(this.boxId + '_recording_buttons');

      if (infoType.firstChild.nodeValue != "channel") {
        channel.style.display = 'none';
        playback.style.display = 'block';
        this.setTextContent('pause', infoType.firstChild.nodeValue);
        this.setTextContent('play', infoType.firstChild.nodeValue);
        this.setTextContent('rwd', infoType.firstChild.nodeValue);
        this.setTextContent('ffw', infoType.firstChild.nodeValue);
        this.setTextContent('stop', infoType.firstChild.nodeValue);
      }
      else {
        playback.style.display = 'none';
        channel.style.display = 'block';
      }
    }

    // private function to activate the info message display if the
    // corresponding element is found in the current page.
    setInfoMessage(xmldoc)
    {
      var info = xmldoc.getElementsByTagName('info').item(0);
      if (info == undefined)
        return;

      var messagebar = $('messagebar');
      if (messagebar == undefined)
        return;

      var message = xmldoc.getElementsByTagName('message').item(0);
      var url = xmldoc.getElementsByTagName('url').item(0);

      if (message.firstChild.nodeValue != "") {
        $('mbmessage').setText(message.firstChild.nodeValue);
        if (url.firstChild != undefined) {
          $('mbdelimiter').removeClass('notpresent');
          $('mbreact').setProperty('href', url.firstChild.nodeValue);
        }
        else {
          $('mbdelimiter').addClass('notpresent');
          $('mbreact').addClass('notpresent');
        }
        messagebar.removeClass('notpresent');
      }
    }

    // private function to display information from EPG info.
    setEpgInfo(xmldoc)
    {
      var epgInfo = xmldoc.getElementsByTagName('epginfo').item(0);

      for (var i = 0; i < epgInfo.childNodes.length; i++) {
        var node = epgInfo.childNodes.item(i);
        if (node.nodeType == 1) {
          var textContent = "";
          if (node.firstChild != null)
            textContent = node.firstChild.nodeValue;
          this.setTextContent(node.nodeName, textContent);
        }
      }
    }

    // private function to update text contents.
    setTextContent(nodeName, textContent)
    {
      var docNode = $(this.boxId + '_' + nodeName);
      if (docNode != null) {
        switch (nodeName) {
        case "caption":
        case "timenow":
        case "name":
        case "duration":
        {
          if (docNode.innerHTML != textContent)
            docNode.innerHTML = textContent;
          break;
        }
        case "elapsed":
        {
          var width = textContent + "%";
          if (docNode.style.width != width)
            docNode.style.width = width;
          break;
        }
        case "nextchan":
        case "prevchan":
        {
          if (textContent != "") {
            docNode.href = "vdr_request/switch_channel?param=" + textContent;
            docNode.style.visibility = "visible";
          }
          else {
            docNode.style.visibility = "hidden";
          }
          break;
        }
        case "pause":
        case "play":
        case "rwd":
        case "ffw":
        case "stop":
        {
          if (textContent != "") {
            docNode.href = "vdr_request/" + nodeName + "_recording?param=" + textContent;
            docNode.style.visibility = "visible";
          }
          else {
            docNode.style.visibility = "hidden";
          }
          break;
        }
        default:
          break;
        }
      }
    }

    // private function to determine update status and to trigger
    // the next update.
    setUpdate(xmldoc)
    {
      /* check if we still need to update the status */
      var upd = xmldoc.getElementsByTagName('update').item(0);
      var rel = (upd.firstChild.nodeValue == "1");

      if (rel != this.reload) {
        this.reload = rel;
        var img = $('statusReloadBtn');
        if (img != null) {
          // change image according to state
          if (this.reload) {
            var icon = getThemedLink('img', 'stop_update.svg');
            var tooltip = this.tooltipStopUpdate;
          } else {
            var icon = getThemedLink('img', 'reload.svg');
            var tooltip = this.tooltipStartUpdate;
          }
          img.src = icon;
          var link = img.parentElement;
          if (tooltip && link != null) {
            link.$tmp.myText = link.$tmp.myText.replace(/\>[^<>]*\</, '>' + tooltip + '<');
          }
        }
      }
      if (this.reload)
        this.timer = this.request.delay(1000, this, true);
    }


    toggleUpdate()
    {
      if (this.reload) {
        if (this.timer != null) {
          this.timer = $clear(this.timer);
        }
      }
      this.request(!this.reload);
    }

    pageFinished()
    {
      if (this.reload) {
        if (this.timer != null) {
          this.timer = $clear(this.timer);
        }
      }
      this.cancel();
    }
}
