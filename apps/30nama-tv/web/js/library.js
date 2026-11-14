/* Device-local watchlist: retain only title metadata, never stream/session payloads. */
(function(){
  function items(){var saved=N.store.get('myList',[]);return Array.isArray(saved)?saved.filter(function(p){return p&&p.id!==undefined&&p.title;}):[];}
  function clean(p){return{id:p.id,title:p.title||{},plot:p.plot||{},image:p.image||{},info:{year:p.info&&p.info.year,age:p.info&&p.info.age,time:p.info&&p.info.time},options:{is_series:!!(p.options&&p.options.is_series)},added:Date.now()};}
  N.library={all:items,has:function(id){return items().some(function(p){return String(p.id)===String(id);});},toggle:function(post){var list=items(),had=N.library.has(post.id);list=list.filter(function(p){return String(p.id)!==String(post.id);});if(!had&&list.length>=200){N.toast(N.t('listFull'));return false;}if(!had)list.unshift(clean(post));N.store.set('myList',list);if(N.library.has(post.id)===had){N.toast(N.t('listSaveError'));return had;}N.toast(N.t(had?'removedTitle':'savedTitle'));document.dispatchEvent(new CustomEvent('nama:listchanged'));return !had;}};
  N.screens.myList=function(root,params,restore){
    root.classList.add('archive','my-list');N.stage.dim(.72);
    var box=N.el('div','arch'),title=N.ui.collectionHeading(N.t('myList'),'list',N.t('listIntro')),windowEl=N.el('div','my-list-window'),track=N.el('div','my-list-track');
    box.appendChild(title);windowEl.appendChild(track);box.appendChild(windowEl);root.appendChild(box);
    var saved=items(),position=N.el('div','my-list-position tab');box.appendChild(position);
    if(!saved.length){var empty=N.el('div','my-list-empty');empty.appendChild(N.ui.icon('list'));empty.appendChild(N.el('div','h-l',N.t('emptyList')));empty.appendChild(N.el('p','',N.t('listHint')));var back=N.ui.btn(N.t('browse'),function(){N.go('archive',{}, {reset:true});},'primary');empty.appendChild(back);box.appendChild(empty);N.nav.focus(back,true);}
    var viewport=N.ui.windowGrid(track,track,{cols:3,pitch:321,column:552,top:26,height:810,create:function(i){
      var post=saved[i],card=N.ui.card(post,'land',{listChanged:N.rerender}),caption=N.el('div','my-list-caption'),name=N.el('div','my-list-name',N.title(post)),meta=N.el('div','my-list-meta',[(post.info&&post.info.year)||'',N.t(post.options&&post.options.is_series?'series':'movie')].filter(Boolean).join(' · '));
      var scrim=N.el('div','my-list-card-scrim');scrim.setAttribute('aria-hidden','true');card.appendChild(scrim);caption.appendChild(name);caption.appendChild(meta);card.appendChild(caption);var cell=N.el('div','my-list-cell');cell.appendChild(card);card._cell=cell;cell.card=card;
      card.onclick=function(){N.go('details',{id:post.id});};
      card.onnav=function(dir){return N.ui.gridNav({length:saved.length,_at:viewport.at},i,3,dir,function(edge){if((edge==='left'||edge==='right')&&N.ui.step(edge)<0)N.rail.enter();return true;});};
      card.onfocus2=function(){var row=Math.floor(i/3),max=Math.max(0,Math.ceil(saved.length/3)*321-758);track._scroll=Math.min(row*321,max);track.style.transform='translateY(-'+track._scroll+'px)';position.textContent=(i+1)+' / '+saved.length;viewport.focus(i);};
      return cell;
    }});
    viewport.setCount(saved.length);
    if(saved.length)N.nav.focus(viewport.at(Math.min(saved.length-1,restore&&restore.index||0)),true);
    var lastWheel=0,wheelDelta=0;function wheel(e){if(!saved.length||N.rail.open||!e.deltaY)return;e.preventDefault();e.stopPropagation();wheelDelta+=e.deltaY;if(Date.now()-lastWheel<150||Math.abs(wheelDelta)<20)return;var index=N.nav.cur&&N.nav.cur._gridIndex;if(index===undefined)return;var next=viewport.at(Math.max(0,Math.min(saved.length-1,index+(wheelDelta>0?3:-3))));wheelDelta=0;if(next){lastWheel=Date.now();N.nav.focus(next,true);}}
    root.addEventListener('wheel',wheel,{passive:false});
    return{destroy:function(){root.removeEventListener('wheel',wheel);viewport.destroy();},focusState:function(){return{index:N.nav.cur&&N.nav.cur._gridIndex||0};}};
  };
})();
