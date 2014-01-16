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

var isRunning = true;


window.addEventListener('blur', function() {
   isRunning = false;
}, false);

window.addEventListener('focus', function() {
   isRunning = true;
}, false);


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
    camera = new THREE.PerspectiveCamera(65, width / height, 1, 1000);
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


/* Draws grid like plane */
function addGrid() {
	var geometry = new THREE.PlaneGeometry(100, 100, 20, 20);
	var material = new THREE.MeshPhongMaterial({color: "rgb(200, 200, 200)", wireframe: true});
	var grid = new THREE.Mesh(geometry, material);
	grid.rotation.x = -Math.PI / 2;
	
	scene.add(grid);
}


function initMVC() {
	var dt = 0.01;
	
	var model = new Model(m, g, omega, theta0, thetaDot0, gamma);
	var view = new View();
	var integrator = new RK4Integrator(dt);

	model.view = view;
	model.integrator = integrator;
	
	controller = new Controller(model);
	controller.loadSimParameters();			// loadSimParameters() must be before addDatGui() method
	controller.addDatGUI();
	controller.setPlots();
	
	view.addToScene(scene);		
}


function animate() {

	var newTime = getTimeInSeconds();
	var frameTime = newTime - currentTime;
	currentTime = newTime;

	accumulator += frameTime;
		
	var dt = controller.model.integrator.dt;

	while (accumulator >= dt) {
		if (isRunning && controller.isSimulationRunning) {
			controller.update();
		}

		accumulator -= dt;                
	}	
		
	/* Will always point to the center of the frame */
	cameraControls.target = new THREE.Vector3(0, 0, 0);
	 
	if (isRunning && controller.isSimulationRunning && controller.isCameraFollowing) {
		cameraControls.rotateRight(controller.model.omega * frameTime);  
	}

	if (isRunning && controller.isSimulationRunning) {
		controller.updatePlots();
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
	this.isSimulationRunning = false;
	
	this.phaseSpacePlot;
	
	var self = this;
	var phaseSpacePlotData = new PlotModelData();
	
	initListeners();
	
	function initListeners() {
		
		$("#startStopButton").click(function() {
			self.toggleSimulationRunning();
		});
		
		$("#resetButton").click(function() {
			self.resetSimulation();
		});
		
		$(".inputtext").keyup(function() {
			self.resetSimulation();
		});
		
	}
	
	this.addDatGUI = function() {
		var gui = new dat.GUI();
		gui.add(self, 'isCameraFollowing');
		gui.add(self.model, 'omega', 0, 10, 0.1);
	}
	
	this.setPlots = function() {
		phaseSpacePlot = jQuery.plot("#phase_space_plot", [], { 
					series: {shadowSize: 0},       
					colors: ['blue'],   
					//xaxis: {min: 0, max: 10}, 
					//yaxis: {min: -5, max: 10}, 
					//zoom: {interactive: true},
					//pan: {interactive: true},     
		});	
	}
	
	this.updatePlots = function() {
		phaseSpacePlotData.addDataPoint(self.model.posVel);

        phaseSpacePlot.setData([phaseSpacePlotData.data]);
        phaseSpacePlot.setupGrid();
        phaseSpacePlot.draw();
	}
	
	this.toggleSimulationRunning = function() {
		this.isSimulationRunning = !this.isSimulationRunning;
	}
	
	this.resetSimulation = function() {
		self.setPlots();
		phaseSpacePlotData.clearData();

		self.loadSimParameters();
		self.update();
	}
	
	this.loadSimParameters = function() {
		model.m = 1*document.getElementById('m').value;
		model.g = 1*document.getElementById('g').value;
		model.omega = 1*document.getElementById('omega').value;
		model.theta = 1*document.getElementById('theta0').value;
		model.thetaDot = 1*document.getElementById('thetaDot0').value;
		model.gamma = 1*document.getElementById('gamma').value;	
		
		model.view.rotate(0, model.theta);	
	}
		
	this.update = function() {
		this.model.move();
	}
	
}


/* View of a bead on rotating ring */
function View() {

	var ringRadius = 5;

	var ring;	
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


/* Model of a bead on rotating ring */
function Model(m, g, omega, theta0, thetaDot0, gamma) {

	this.R = 5;
	this.m = m;
	this.g = g;
	this.omega = omega;
	this.theta = theta0;
	this.thetaDot = thetaDot0;
	this.gamma = gamma;
	
	this.phi = 0;
	
	this.view;
	this.integrator;

	this.posVel;

    this.accel = function(x, v) { 
		var omega2 = this.omega * this.omega;

		return Math.sin(x) * (omega2 * Math.cos(x) + this.g / this.R) - this.gamma / this.m * v;
    };
        
    this.move =  function() {
        this.posVel = this.integrator.integrate(this);

        this.theta = this.posVel[0];
        this.thetaDot = this.posVel[1];

        this.phi = this.phi + this.omega * this.integrator.dt;

        this.view.rotate(this.phi, this.theta);
    };
    
}


/* Runge-Kutta integrator 4-th order */
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
    };
        
}


function PlotModelData() {
	
    this.data = [];

    this.addDataPoint = function(point) {
        this.data.push(point);                
    };
    
    this.clearData = function() {
		this.data = [];
	};

}


