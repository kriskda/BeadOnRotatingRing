var renderer;
var scene;
var camera;
var cameraControls;
var controller;

var container = document.getElementById("threejs_container");
var width = container.offsetWidth;
var height = container.offsetHeight;

var accumulator = 0;
var currentTime = getTimeInSeconds();

init();
animate();




function init() {
	initRenderer();
	initScene();
	initCamera();
	initLight();
	
	addGrid();
	
	initMVC();
}


function initRenderer() {
	renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(width, height);  
    renderer.setClearColor("rgb(255, 255, 255)", 1); 

	container.appendChild(renderer.domElement);
}


function initScene() {
    scene = new THREE.Scene();
}


function initCamera() {
    camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000);
    camera.position.set(0, 10, 20);   
    
    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);    
    cameraControls.noPan = false;
    cameraControls.noKeys = true;
}


function initLight() {
    var light = new THREE.PointLight("rgb(255, 255, 255)");
    
    light.position.set(300, 300, 10);
    scene.add(light);        
}

/* Draws plane like grid */
function addGrid() {
	var geometry = new THREE.PlaneGeometry(100, 100, 20, 20);
	var material = new THREE.MeshPhongMaterial({color: "rgb(200, 200, 200)", wireframe: true});
	var grid = new THREE.Mesh(geometry, material);
	
	grid.rotation.x = -Math.PI / 2;
	scene.add(grid);
}

function initMVC() {
	var dt = 0.01;
	
	var R = 1*document.getElementById('R').value;
	var m = 1*document.getElementById('m').value;
	var g = 1*document.getElementById('g').value;
	var omega = 1*document.getElementById('omega').value;
	var theta0 = 1*document.getElementById('theta0').value;
	var thetaDot0 = 1*document.getElementById('thetaDot0').value;
	var gamma = 1*document.getElementById('gamma').value;
	
	var model = new Model(R, m, g, omega, theta0, thetaDot0, gamma);
	var view = new View(0, theta0);
	var integrator = new RK4Integrator(dt);
	
	model.view = view;
	model.integrator = integrator;
	
	controller = new Controller(model);

	var gui = new dat.GUI();
	gui.add(controller, 'isCameraFollowing');
	gui.add(controller.model, 'omega', 0, 10, 0.1);
	
	view.addToScene(scene);		
}


function animate() {
    var newTime = getTimeInSeconds();
    var frameTime = newTime - currentTime;
    currentTime = newTime;

    accumulator += frameTime;
    
    var dt = controller.model.integrator.dt;

    while (accumulator >= dt) {
        controller.update();

        accumulator -= dt;                
    }	
    
    /* Will always point to the center of the frame */
    cameraControls.target = new THREE.Vector3(0, 0, 0);
 
	if (controller.isCameraFollowing) {
		cameraControls.rotateRight(controller.model.omega * frameTime);  
	}
	
	cameraControls.update();
	
	renderer.render(scene, camera);
    requestAnimationFrame(animate);	
}


function getTimeInSeconds() {
    return new Date().getTime() / 1000;
}


function Controller(model) {
	
	this.model = model;
	this.isCameraFollowing = true; 
	
	this.update = function() {
		this.model.move();
	}
	
}


/* View of bead on rotating ring */
function View(phi, theta) {
	
	var ring;
	var ringRadius = 5;
	var shiftY = ringRadius + 2;
	var lineIndicator;
	var bead;
	
	init();
	
	function init() {		
		var ringGeometry = new THREE.TorusGeometry(ringRadius, 0.05, 128, 128);
		var ringMaterial = new THREE.MeshPhongMaterial();
			
		ring = new THREE.Mesh(ringGeometry, ringMaterial);
		ring.position.x = 0;
		ring.position.y = shiftY;
		ring.position.z = 0;
		
		var lineGeometry = new THREE.Geometry();	
		var lineMaterial = new THREE.LineBasicMaterial({color: 0x000000, lineWidth: 1});

		lineGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
        lineGeometry.vertices.push(new THREE.Vector3(0, shiftY + ringRadius));
        
        lineIndicator = new THREE.Line(lineGeometry, lineMaterial);
        
        var beadGeometry = new THREE.SphereGeometry(0.3, 32, 32);
        var beadMaterial = new THREE.MeshPhongMaterial({color: "rgb(255, 0, 0)"});
        
        bead = new THREE.Mesh(beadGeometry, beadMaterial);
        
        rotate(phi, theta);
	}
	
	function addToScene(scene) {
		scene.add(ring);
		scene.add(lineIndicator);
		scene.add(bead);
	}
	
	function rotate(phi, theta) {
		ring.rotation.y = phi;

		bead.position.x = ringRadius * Math.sin(theta) * Math.cos(-phi);
		bead.position.y = ringRadius * Math.cos(theta) + shiftY;
        bead.position.z = ringRadius * Math.sin(theta) * Math.sin(-phi);
	}
	
	return {
        addToScene: addToScene,
        rotate: rotate,
    }
	
}


function Model(R, m, g, omega, theta0, thetaDot0, gamma) {

	this.omega = omega;
	this.view;
	this.integrator;
	
	this.phi = 0;
    this.theta = theta0;
	this.thetaDot = thetaDot0;

    this.accel = function(x, v) { 
		var omega2 = this.omega * this.omega;

		return Math.sin(x) * (omega2 * Math.cos(x) + g / R) - gamma / m * v;
    }
        
    this.move =  function() {
        var stateVect = this.integrator.integrate(this);

        this.theta = stateVect[0];
        this.thetaDot = stateVect[1];

        this.phi = this.phi + this.omega * this.integrator.dt;

        this.view.rotate(this.phi, this.theta);
    }	
    
}


function RK4Integrator(dt) {
	
	this.dt = dt;

    this.integrate = function(model) {
        var x1, x2, x3, x4;
        var v1, v2, v3, v4;
        var a1, a2, a3, a4;

        x1 = model.theta;        
        v1 = model.thetaDot;
        a1 = model.accel(x1, v1);

        x2 = x1 + 0.5 * v1 * dt;
        v2 = v1 + 0.5 * a1 * dt;
        a2 = model.accel(x2, v2);
    
        x3= x1 + 0.5 * v2 * dt;
        v3= v1 + 0.5 * a2 * dt;
        a3 = model.accel(x3, v3);
    
        x4 = x1 + v3 * dt;
        v4 = v1 + a3 * dt;
        a4 = model.accel(x4, v4);
              
        var x = x1 + (dt / 6.0) * (v1 + 2 * v2 + 2 * v3 + v4);
        var v = v1 + (dt / 6.0) * (a1 + 2 * a2 + 2 * a3 + a4);                
                
        return [x, v]
    }
        
}

