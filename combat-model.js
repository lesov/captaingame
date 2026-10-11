/* ---------- Shared combat model ----------
   Pure, non-UI sailing/ballistics/damage math + ship class data, shared by
   test.htm (loaded first as a plain classic script so its top-level consts
   are visible to the main game script) and by the Node test suite under
   test/ (via the module.exports guard at the bottom). Keep everything here
   free of DOM/canvas/audio access and free of Math.random() where a result
   needs to stay testable/deterministic. */
const D2R=Math.PI/180,R2D=180/Math.PI,TAU=Math.PI*2,KN=0.5144,TS=3,G=9.81,MUZ=4;
const wrap=a=>{a%=TAU;return a<0?a+TAU:a};
const adiff=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d};
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const rnd=(a,b)=>a+Math.random()*(b-a);
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v)};
const PTS=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
const compass=a=>PTS[Math.round(wrap(a)/(TAU/16))%16];

/* No-go cone: a square-rigger cannot hold a heading within NOGO degrees of
   the true wind (sails go aback). HELM_MARGIN is deliberately a few degrees
   wider than NOGO: it's the target heading sailable()/the AI steer toward,
   so a ship aiming for the edge of the cone doesn't stall right on the
   boundary the instant the wind twitches. */
const NOGO=62, HELM_MARGIN=70;

/* ---------- Ballistics ---------- */
const AMMO={
  round:{name:'round',v0:440,c:6.5e-4,n:1,spread:0.9,size:2.0},
  chain:{name:'chain',v0:360,c:1.6e-3,n:1,spread:2.0,size:2.6},
  grape:{name:'grape',v0:400,c:3.2e-3,n:8,spread:3.2,size:1.1},
};
const TABLE={};
for(const k in AMMO){const a=AMMO[k],rows=[];
  for(let e=-3;e<=12.001;e+=0.25){let x=0,z=MUZ,vx=a.v0*Math.cos(e*D2R),vz=a.v0*Math.sin(e*D2R),t=0,dt=0.004;
    while(t<60){const v=Math.hypot(vx,vz);vx-=a.c*v*vx*dt;vz+=(-G-a.c*v*vz)*dt;x+=vx*dt;z+=vz*dt;t+=dt;if(z<=0)break}
    rows.push({e,r:x,t});}
  TABLE[k]=rows;}
function rangeAt(k,e){const T=TABLE[k];e=clamp(e,-3,12);const f=(e+3)/0.25,i=Math.min(T.length-2,Math.floor(f)),u=f-i;return T[i].r*(1-u)+T[i+1].r*u}
function elevFor(k,d){const T=TABLE[k];for(let i=1;i<T.length;i++)if(T[i].r>=d){const a=T[i-1],b=T[i],u=(d-a.r)/(b.r-a.r);return {e:a.e+(b.e-a.e)*u,t:a.t+(b.t-a.t)*u}}return null}

/* ---------- Sailing ---------- */
function polar(t){if(t<NOGO)return 0;if(t<75)return (t-NOGO)/13*0.6;if(t<135)return 0.6+(t-75)/60*0.4;return 1-(t-135)/45*0.13}
function pointOfSail(t,v){if(t<NOGO)return v<-0.05?'Aback, sternway':'In irons';if(t<80)return 'Close-hauled';if(t<105)return 'Beam reach';if(t<155)return 'Broad reach';return 'Running'}
const SAILS=['Furled','Battle sails','Full sail'],SAILF=[0,0.6,1];
function sailable(hd,windFrom,lim=HELM_MARGIN){const off=adiff(hd,windFrom);if(Math.abs(off)<lim*D2R)return wrap(windFrom+(off>=0?1:-1)*lim*D2R);return hd}

/* ---------- Gun mounts ----------
   Index convention used throughout: 0=larboard broadside, 1=starboard
   broadside, 2=bow chaser, 3=stern chaser. BEARING is each mount's fixed
   azimuth offset from the ship's heading (radians, same sin/cos convention
   as heading itself: vx=sin(a), vy=-cos(a)). Chaser counts are 0 for classes
   without one, so every helper below degrades gracefully (zero guns, no
   shots, no HUD band) with no special-casing beyond that. */
const BEARING=[-Math.PI/2,Math.PI/2,0,Math.PI];
function mountCount(C,i){return i<2?C.guns:i===2?(C.chaserBow||0):(C.chaserStern||0)}
/* isBroadside: only port/starboard guns go awash when heeled hard away from
   the target; bow/stern chasers sit on the centerline and are never masked
   by heel. sideHeel is sideSign(i)*ship.heel, i.e. positive when this side
   is the heeled-up (lee-opposite) side. */
function gunsAvailCount(n,isBroadside,sideHeel){return isBroadside&&sideHeel<-5.5?Math.ceil(n/2):n}

/* ---------- Damage-to-handling multipliers ----------
   The single source of truth for how hull/sail/crew damage degrades a ship:
   updateShip() in test.htm calls these for the live simulation, and the
   pause stats panel calls the same functions to display the effect, so the
   two can never drift apart. */
function speedMultiplier(hullFrac){return 0.55+0.45*clamp(hullFrac,0,1)}
function turnMultiplier(crew,sails){return (0.5+0.5*clamp(crew,0,1))*(0.6+0.4*clamp(sails,0,1))}
function reloadMultiplier(crew){return 0.35+0.65*clamp(crew,0,1)}

/* ---------- Damage ----------
   zone 'hull' = a hit on the hull footprint; zone 'rig' = a hit that landed
   in the rigging zone above the hull (already gated by a per-ammo
   probability at the call site). dmgMult is the firing ship's relative gun
   caliber (CLASSES[x].dmg). Deliberately free of Math.random() so it's
   deterministic for tests; the one bit of original variance (round shot's
   +/-30% hull roll) is applied by the caller. */
function computeDamage(k,e,dmgMult,zone){
  dmgMult=dmgMult||1;
  if(zone==='rig'){
    if(k==='chain')return{hull:0,crew:0,sails:0.035*e*dmgMult};
    if(k==='round')return{hull:0,crew:0,sails:0.008*dmgMult};
    return{hull:0,crew:0.004*dmgMult,sails:0.002*dmgMult}; // grape
  }
  if(k==='round')return{hull:2*e*dmgMult,crew:0.012*e*dmgMult,sails:0.004*dmgMult};
  if(k==='chain')return{hull:0.5*e*dmgMult,crew:0.006*dmgMult,sails:0};
  return{hull:0.12*e*dmgMult,crew:0.007*e*dmgMult,sails:0}; // grape
}

/* ---------- Ship classes ---------- */
const RELOAD=75; // ship-clock seconds
const CLASSES={
  shipline:{name:'ship of the line',L:58,B:15,guns:26,hull:160,speedK:0.34,turn:2.0,hh:7.5,dmg:1.3,chaserBow:0,chaserStern:2,
    blurb:'A floating fortress of oak — ponderous, but her broadside settles most arguments before they begin.'},
  fourth:{name:'fourth-rate',L:44,B:12,guns:20,hull:110,speedK:0.42,turn:2.8,hh:6,dmg:1.1,chaserBow:0,chaserStern:0,
    blurb:'Slow and broad in the beam, but a broadside that ends arguments.'},
  galleon:{name:'galleon',L:44,B:14,guns:10,hull:140,speedK:0.33,turn:1.9,hh:6.8,dmg:0.75,chaserBow:1,chaserStern:0,
    blurb:'Built to carry treasure, not to fight — she shrugs off round shot that would sink a frigate, but her guns are old and few.'},
  frigate:{name:'frigate',L:38,B:10.5,guns:14,hull:80,speedK:0.46,turn:3.5,hh:5.5,dmg:1.0,chaserBow:1,chaserStern:0,
    blurb:'The classic compromise: enough legs to choose the range, enough guns to win it.'},
  brigantine:{name:'brigantine',L:25,B:7.5,guns:7,hull:38,speedK:0.54,turn:5.4,hh:4.0,dmg:0.8,chaserBow:1,chaserStern:0,
    blurb:'Low, fast, and lightly built — she wins by never taking a broadside at all.'},
  sloop:{name:'sloop',L:28,B:8,guns:8,hull:45,speedK:0.5,turn:4.6,hh:4.2,dmg:0.85,chaserBow:0,chaserStern:0,
    blurb:'Small and quick, lightly armed — she lives on speed and angles.'},
};

if(typeof module!=='undefined'&&module.exports)
  module.exports={D2R,R2D,TAU,KN,TS,G,MUZ,wrap,adiff,clamp,rnd,gauss,compass,
    NOGO,HELM_MARGIN,AMMO,CLASSES,RELOAD,SAILS,SAILF,BEARING,
    polar,pointOfSail,sailable,rangeAt,elevFor,computeDamage,gunsAvailCount,mountCount,
    speedMultiplier,turnMultiplier,reloadMultiplier};
