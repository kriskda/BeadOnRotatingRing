var renderer;
var scene;
var camera;
var controls;

init();
animate();

var view;


function init() {
	initRenderer();
	initScene();
	initCamera();
	initLight();
	
	addGrid();
	
	var view = new View(-45, -45);
	view.addToScene(scene);
}


function initRenderer() {
	renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(800, 600);  
    renderer.setClearColor("rgb(255, 255, 255)", 1); 

    document.body.appendChild(renderer.domElement);
}


function initScene() {
    scene = new THREE.Scene();
}


function initCamera() {
    camera = new THREE.PerspectiveCamera(75, 800 / 600, 1, 1000);
    camera.position.set(0, 10, 20);   
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);    
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


function animate() {
	renderer.render(scene, camera);
    requestAnimationFrame(animate);	
    controls.update();
}


/* View of bead on rotating ring */
function View(omega, theta) {
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
        
        rotate(omega, theta);
	}
	
	function addToScene(scene) {
		scene.add(ring);
		scene.add(lineIndicator);
		scene.add(bead);
	}
	
	function rotate(omega, theta) {
		omega = omega * Math.PI / 180;
		theta = theta * Math.PI / 180;
		
		ring.rotation.y = omega;

		bead.position.x = ringRadius * Math.sin(theta) * Math.cos(-omega);
		bead.position.y = -ringRadius * Math.cos(theta) + shiftY;
        bead.position.z = ringRadius * Math.sin(theta) * Math.sin(-omega);
	}
	
	return {
        addToScene: addToScene,
        rotate: rotate,
    }
	
}



