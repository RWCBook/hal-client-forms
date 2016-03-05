/*******************************************************
 * hal-json HTML/SPA client engine
 * May 2015
 * Mike Amundsen (@mamund)
 * Soundtrack : Red Clay : Freddie Hubbard
 *******************************************************/

/* NOTE:
  - no support for:
  - _links.curies
  - relies on a customer halForms() implementation
  
  - has fatal dependency on:
    - uritemplate.js
    - dom-help.js
  - uses no other external libs/frameworks
  
  - built/tested for chrome browser (YMMV on other browsers)
  - designed to act as a "validator" for a human-driven HAL client.
  - not production robust (missing error-handling, perf-tweaking, etc.)
  - report issues to https://github.com/rwcbook/
*/

function hal() {

  var forms = halForms();
  var d = domHelp();  
  var g = {};
  
  g.url = '';
  g.hal = null;
  g.ctype = "application/vnd.hal+json";
  g.title = "";
  g.context = "";
  
  g.fields = {};
  g.fields.home = [];
  g.fields.task = ["id","title","tags","completeFlag","assignedUser"];
  g.fields.user = ["nick","password","name"];
  
  // init library and start
  function init(url, title) {

    g.title = title||"HAL Client";
    
    if(!url || url==='') {
      alert('*** ERROR:\n\nMUST pass starting URL to the HAL library');
    }
    else {
      g.url = url;
      req(g.url,"get");
    }
  }

  // primary loop
  function parseHAL() {
    halClear();
    title();
    setContext();
    if(g.context!=="") {
      selectLinks("app", "toplinks");
      selectLinks("list", "links");
      content();
      embedded();
      properties();
    }
    else {
      alert("Unknown Context, can't continue");
    }
    dump();
  }

  // handle title for page
  function title() {
    var elm = d.find("title");
    elm.innerText = g.title;
  }
  
  // just for debugging help
  function dump() {
    var elm = d.find("dump");
    elm.innerText = JSON.stringify(g.hal, null, 2);
  }
  
  function setContext() {
    var link;
    
    link = findLink("self");
    if(link) {
      switch(link.title) {
        case "Home":
          g.context = "home";
          break;
        case "Tasks":
          g.context = "task";
          break;
        case "Users":
          g.context = "user";
          break;
        default:
          g.context = "";
      }
    } 
  }

  // return any content for this page
  function content() {
    var elm;
    
    elm = d.find("content");
    if(g.hal.content) {
      elm.innerHTML = g.hal.content;
    }
  }
    
  // show selected links (based on name)
  function selectLinks(filter, section, itm) {
    var elm, coll;
    var menu, item, a, sel, opt, id;
    
    elm = d.find(section);
    d.clear(elm);
    if(g.hal._links) {
      coll = g.hal._links;
      menu = d.node("div");
      menu.className = "ui blue menu";
      
      for(var link in coll) {
        if(coll[link].target && coll[link].target.indexOf(filter)!==-1) {
          id = (itm && itm.id?itm.id:"");

          a = d.anchor({
            rel:link,
            className: "item",
            href:coll[link].href.replace('{key}',id),
            title:(coll[link].title||coll[link].href.replace('{key}',id)),
            text:(coll[link].title||coll[link].href.replace('{key}',id))
          });

          // add internal attributes
          a.setAttribute("templated", coll[link].templated||"false");
          a = halAttributes(a,coll[link]);
          
          item = d.node("div");
          if (elm.id !== "links" && elm.id !== "toplinks") {
            item.className = "ui basic blue link item action button";
          }
          item.onclick = halLink;
          
          d.push(a, item);
          d.push(item, menu);
        }
      }
      d.push(menu, elm);
    }
    if (menu.hasChildNodes()) {
      elm.style.display = "block";
    } else {
      elm.style.display = "none";
    }

    if (elm.id === "links") {
      menu.className += " stackable";
    } else if (elm.id === "toplinks") {
      menu.className += " fixed top";
    } else {
      // use mini buttons for item actions
      menu.className = "ui mini buttons";
    }
  }

  function findLink(target) {
    var rtn, coll;
    
    if(g.hal._links) {
      coll = g.hal._links;
      for(var link in coll) {
        if(link.indexOf(target)!==-1) {
          rtn = coll[link];
          break;
        }
      }
    }
    return rtn;
  }
   
  // handle any embedded content
  function embedded() {
    var elm, embeds, links;
    var segment, table, tr;
    
    elm = d.find("embedded");
    d.clear(elm);
    
    if(g.hal._embedded) {
      
      // get all the rel/sets for this response
      embeds = g.hal._embedded;
      for(var coll in embeds) {

        p = d.para({text:coll, className:"ui header segment"});
        d.push(p,elm);
        
        // get all the links for this rel/set
        items = embeds[coll];
        for(var itm of items) {
          segment = d.node("div");
          segment.className = "ui segment";
          links = d.node("div");
          links.id = itm.id;
          d.push(links,segment);
          
          // emit all the properties for this item
          table = d.node("table");
          table.className = "ui table";
          for(var prop of g.fields[g.context]) {
            if(itm[prop]) {
              tr = d.data_row({className:"property "+prop,text:prop+"&nbsp;",value:itm[prop]+"&nbsp;"});
              d.push(tr,table);
            }
          }
          
          // push the item element to the page
          d.push(table,segment);
          d.push(segment, elm);

          // emit any item-level links
          selectLinks("item",itm.id, itm);          
        }        
      }
    }
    if (elm.hasChildNodes()) {
      elm.style.display = "block";
    } else {
      elm.style.display = "none";
    }
  }
  
  // emit any root-level properties
  function properties() {
    var elm, coll;
    var segment, table, tr;
    
    elm = d.find("properties");
    d.clear(elm);
    segment = d.node("div");
    segment.className = "ui segment";
    if(g.hal && g.hal.id) {
      links = d.node("div");
      links.id = g.hal.id;
      d.push(links,segment);
    }
        
    table = d.node("table");
    table.className = "ui very basic collapsing celled table";

    for(var prop of g.fields[g.context]) {
      if(g.hal[prop]) {
        tr = d.data_row({className:"property "+prop,text:prop+"&nbsp;",value:g.hal[prop]+"&nbsp;"});
        d.push(tr,table);
      }
    }    

    d.push(table,segment);
    d.push(segment,elm);

    if (table.hasChildNodes()) {
      elm.style.display = "block";
    } else {
      elm.style.display = "none";
    }

    // emit any item-level links
    if(g.hal && g.hal.id) {
      selectLinks("item",g.hal.id, g.hal);
    }
  }  
  
  // show form for input
  // see the halForms() lib for inputs
  function halShowForm(hf, href, title) {
    var elm, coll, val, f;
    var form, header, fs, p, inp;
     
    elm = d.find("form");
    d.clear(elm);

    // grab HAL-FORM properties
    f = hf._templates.default;
    
    form = d.node("form");
    form.action = href;
    form.method = f.method;
    form.setAttribute("halmethod", f.method);
    form.className = f.rel;
    form.onsubmit = halSubmit;
    fs = d.node("div");
    fs.className = "ui form";
    header = d.node("div");
    header.innerHTML = title||"Form";
    header.className = "ui dividing header";
    d.push(header, fs);

    coll = f.properties;
    for(var prop of coll) {
      segment = d.node("div");
      segment.className = "ui green segment";

      val = prop.value;
      if(g.hal[prop.name]) {
        val = val.replace("{"+prop.name+"}",g.hal[prop.name]);
      } 
      else {
        val = val.replace("{"+prop.name+"}","");
      }
      
      p = d.input({
        prompt:prop.prompt,
        name:prop.name,
        value:val, 
        required:prop.required,
        readOnly:prop.readOnly,
        pattern:prop.pattern
      });
      d.push(p,fs);
    }
    
    p = d.node("p");
    inp = d.node("input");
    inp.type = "submit";
    inp.className = "ui mini positive submit button";
    d.push(inp,p);

    inp = d.node("input");
    inp.type = "button";
    inp.value = "Cancel";
    inp.onclick = function(){elm = d.find("form");d.clear(elm);}
    inp.className = "ui mini cancel button";
    d.push(inp,p);

    d.push(p,fs);            
    d.push(fs,form);
    d.push(form, segment);
    d.push(segment, elm);
  }  
  
  // ***************************
  // hal helpers
  // ***************************

  // handle hal-specific attributes
  function halAttributes(elm,link) {
    var coll;
    
    coll = ["deprecation","type","name","profile","hreflang"]
    
    for(var attr of coll) {
      if(link[attr] && link[attr]!=="") {
        elm.setAttribute(attr,link[attr]);
      }
    }
    return elm;  
  }
  
  // clear out the page
  function halClear() {
    var elm;

    elm = d.find("dump");
    d.clear(elm);
    elm = d.find("links");
    d.clear(elm);
    elm = d.find("form");
    d.clear(elm);
    elm = d.find("properties");
    d.clear(elm);
  }

  // handle GET for links
  function halLink(e) {
    var elm, form, href, accept, fset;

    elm = e.target;
    accept = elm.getAttribute("type"); 
    
    // build stateless block
    fset = {};
    fset.rel = elm.rel;
    fset.href = elm.href;
    fset.title = elm.title;
    fset.accept = elm.accept;
    fset.func = halFormResponse;
    
    // execute check for a form
    formLookUp(fset);
    
    return false;    
  }

  function formLookUp(fset) {
    req(fset.rel, "get", null, null, "application/prs.hal-forms+json", fset);
  }  

  function halFormResponse(form, fset) {
    if(form && form!==null && !form.error && fset.status<400)  {
      // valid form resonse? show it
      halShowForm(form, fset.href, fset.title);
    }
    else {
      // must be a simple HAL response, then
      req(fset.href, "get", null, null, fset.accept||g.ctype, null);
    }
    return false;
  }

  // handle all parameterized requests/form submits
  function halSubmit(e) {
    var form, query, nodes, i, x, args, url, method, template, accept;
    
    args = {};
    form = e.target;
    query = form.action;
    query = query.replace(/%7B/,'{').replace(/%7D/,'}'); // hack
    template = UriTemplate.parse(query);
    method = form.getAttribute("halmethod")||form.method;
    accept = form.getAttribute("type")||g.ctype;
    
    // gather inputs
    nodes = d.tags("input", form);
    for(i=0, x=nodes.length;i<x;i++) {
      if(nodes[i].name && nodes[i].name!=='') {
        args[nodes[i].name] = nodes[i].value;
      }
    }

    // resolve any URITemplates
    url = template.expand(args);

    // use app/json for bodies    
    if(method!=="get" && method!=="delete") {
      req(url, method, JSON.stringify(args), "application/json", accept);
    }
    else {
      req(url, method ,null, null, accept);
    }
    return false;
  }
  
  // ********************************
  // ajax helpers
  // ********************************  

  // low-level HTTP stuff
  function req(url, method, body, content, accept, fset) {
    var ajax = new XMLHttpRequest();
    ajax.onreadystatechange = function(){rsp(ajax, fset)};
    ajax.open(method, url);
    ajax.setRequestHeader("accept",accept||g.ctype);
    if(body && body!==null) {
      ajax.setRequestHeader("content-type", content||g.ctype);
    }
    ajax.send(body);
  }
  
  function rsp(ajax, fset) {
    var form, func;
    
    if(ajax.readyState===4) {
      if(fset) {
        fset.status = ajax.status;
        form = JSON.parse(ajax.responseText);
        func = fset.func;
        func(form, fset); 
      }
      else {
        g.hal = JSON.parse(ajax.responseText);
        parseHAL();
      }
    }
  }

  // export function
  var that = {};
  that.init = init;
  return that;
}

/***************************
 FORMS for HAL-JSON
 
 This is a custom implementation to support human input forms for HAL
 - define a form (rel, method, arguments)
 - set rel == hal._link.rel
 - halForms.loolkup(re) : use rel as a lookup at runtime to get form definition
 - display form (see halShowForm) and handle submission

 NOTE:
 optionally, halForms.lookup(rel) could call an external service 
 using the rel as a URL that returns the JSON definition
 
 **************************/
function halForms() {

  // return form
  function lookUp(rel) {
    var rtn, i, x;

    for(i=0, x=forms.length;i<x;i++) {
      if(forms[i].rel && rel.indexOf(forms[i].rel)!==-1) {
        rtn = forms[i];
        break;
      }
    }
    return rtn;
  }  

  // load forms once
  var forms = [];
  
  // TASK FORMS
  forms.push({
    rel:"/files/hal-task-create-form",
    method:"post",
    properties: [
      {name:"title",required:true, value:"", prompt:"Title"},
      {name:"tags", value:"", prompt:"Tags"},
      {name:"completeFlag",required:false,value:"false", prompt:"Completed"}
    ]
  });

  forms.push({
    rel:"/files/hal-task-edit",
    method:"put",
    properties:   [
      {name:"id",required:true, value:"{id}", prompt:"ID", readOnly:true},
      {name:"title",required:true, value:"{title}", prompt:"Title", regex:""},
      {name:"tags", value:"{tags}", prompt:"Tags"},
      {name:"completeFlag",value:"{completeFlag}", prompt:"Completed"},
      {name:"assignedUser",value:"{assignedUser}", prompt:"Assigned User"}
    ]
  });

  forms.push({
    rel:"/files/hal-task-remove",
    method:"delete",
    properties: [
      {name:"id",required:true, value:"{id}", prompt:"ID", readOnly:true}
    ]
  });

  forms.push({
    rel:"/files/hal-task-active",
    method:"get",
    properties: [
      {name:"completeFlag",value:"false", prompt:"Completed", readOnly:true}
    ]
  });

  forms.push({
    rel:"/files/hal-task-completed",
    method:"get",
    properties: [
      {name:"completeFlag",value:"true", prompt:"Completed", readOnly:true}
    ]
  });

  forms.push({
    rel:"/files/hal-task-markcompleted",
    method:"post",
    properties: [
      {name:"id",value:"{id}", prompt:"ID",readOnly:true},
      {name:"completeFlag",value:"true", prompt:"Completed",readOnly:true}
    ]
  });

  forms.push({
    rel:"/files/hal-task-markactive",
    method:"post",
    properties: [
      {name:"id",value:"{id}", prompt:"ID",readOnly:true},
      {name:"completeFlag",value:"false", prompt:"Completed",readOnly:true}
    ]
  });

  forms.push({
    rel:"/files/hal-task-assignuser",
    method:"post",
    properties: [
      {name:"id",value:"{id}", prompt:"ID",readOnly:true},
      {name:"assignedUser",value:"", prompt:"AssignedUser",required:true}
    ]
  });

  forms.push({
    rel:"/files/hal-task-bytitle",
    method:"get",
    properties: [
      {name:"title",value:"", prompt:"Title",required:true}
    ]
  });

  forms.push({
    rel:"/files/hal-task-byuser",
    method:"get",
    properties: [
      {name:"assignedUser",value:"", prompt:"Assigned User",required:true}
    ]
  });

  forms.push({
    rel:"/files/hal-task-bytag",
    method:"get",
    properties: [
      {name:"tags",value:"", prompt:"Tags",required:true}
    ]
  });
    
  // USER FORMS
  forms.push({
    rel:"/files/hal-user-create-form",
    method:"post",
    properties: [
      {name:"nick",value:"", prompt:"Nickname",required:true,pattern:"[a-zA-Z0-9]+"},
      {name:"password",required:true,value:"", prompt:"Password",pattern:"[a-zA-Z0-9!@#$%^&*-]+"},
      {name:"name", value:"", prompt:"Full Name", required:true}
    ]
  });
    
  forms.push({
    rel:"/files/hal-user-usersbynick",
    method:"get",
    properties: [
      {name:"nick",value:"", prompt:"Nickname", required:true}
    ]
  });

  forms.push({
    rel:"/files/hal-user-usersbyname",
    method:"get",
    properties: [
      {name:"name",value:"", prompt:"Full Name", required:true}
    ]
  });

  forms.push({
    rel:"/files/hal-user-edit-form",
    method:"put",
    properties: [
      {name:"id",value:"{id}", prompt:"ID",readOnly:true},
      {name:"nick",value:"{nick}", prompt:"Nickname",readOnly:true},
      {name:"name", value:"{name}", prompt:"Full Name", required:true}
    ]
  });

  forms.push({
    rel:"/files/hal-user-changepw",
    method:"post",
    properties: [
      {name:"id",value:"{id}", prompt:"ID",readOnly:true},
      {name:"oldpass",value:"", prompt:"Old Password",required:true, pattern:"[a-zA-Z0-9!@#$%^&*-]+"},
      {name:"newpass",value:"", prompt:"New Password",required:true, pattern:"[a-zA-Z0-9!@#$%^&*-]+"},
      {name:"checkpass",value:"", prompt:"Confirm Password",required:true, pattern:"[a-zA-Z0-9!@#$%^&*-]+"}
    ]
  });
    
  var that = {};
  that.lookUp = lookUp;

  return that;
}

// *** EOD ***
