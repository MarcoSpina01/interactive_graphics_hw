// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix(translationX, translationY, translationZ, rotationX, rotationY) {
	// Rotation matrix around the x axis
	const rotX = [
		1, 0, 0, 0,
		0, Math.cos(rotationX), -Math.sin(rotationX), 0,
		0, Math.sin(rotationX), Math.cos(rotationX), 0,
		0, 0, 0, 1
	];

	// Rotation matrix around the y axis
	const rotY = [
		Math.cos(rotationY), 0, Math.sin(rotationY), 0,
		0, 1, 0, 0,
		-Math.sin(rotationY), 0, Math.cos(rotationY), 0,
		0, 0, 0, 1
	];

	const trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	const mv = MatrixMult(trans, rotY);
	return MatrixMult(mv, rotX);
}

class MeshDrawer {
	constructor() {
		this.canvas = document.getElementById("canvas");
		this.gl = this.canvas.getContext("webgl");

		// Vertex shader source code
		this.vertexShaderCode = `
            attribute vec3 coordinates;
            attribute vec3 normal;
            uniform mat4 modelViewMatrix;
            uniform mat4 transformationMatrix;
            uniform mat3 normalMatrix;
            attribute vec2 texCoord;
            varying vec2 vTexCoord;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            uniform bool uSwapYZ;

            void main() {
                if (uSwapYZ == false) {
                    gl_Position = transformationMatrix * vec4(coordinates, 1.0);
                    vNormal = normalize(normalMatrix * normal);
                } else {
                    vec3 newCoordinates = vec3(coordinates.x, coordinates.z, coordinates.y);
                    gl_Position = transformationMatrix * vec4(newCoordinates, 1.0);
                    vNormal = normalize(normalMatrix * vec3(normal.x, normal.z, normal.y));
                }

                vTexCoord = texCoord;
                vViewDir = normalize(-vec3(modelViewMatrix * vec4(coordinates, 1.0)));
            }
        `;

		// Fragment shader source code
		this.fragmentShaderCode = `
            precision mediump float;
            varying vec2 vTexCoord;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            uniform sampler2D uSampler;
            uniform bool uTexture;
            uniform vec3 uLightDir;
            uniform float uShininess;

            void main() {
                vec3 lightDir = normalize(uLightDir);
                vec3 normal = normalize(vNormal);
                vec3 viewDir = normalize(vViewDir);

                vec3 diffuseColor = vec3(1.0, 1.0, 1.0);
                vec3 specularColor = vec3(1.5, 1.5, 1.5);

                if (uTexture) {
                    diffuseColor = texture2D(uSampler, vTexCoord).rgb;
                }

                float ambient = 0.05;
                float diffuse = max(0.0, dot(normal, lightDir));
                float specular = 0.0;

                if (diffuse > 0.0) {
                    vec3 halfDir = normalize(lightDir + viewDir);
                    specular = pow(max(0.0, dot(normal, halfDir)), uShininess);
                }

                vec3 color = diffuseColor * (ambient + diffuse) + specularColor * specular;
                gl_FragColor = vec4(color, 1.0);
            }
        `;

		// Create and compile vertex and fragment shaders
		this.vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
		this.gl.shaderSource(this.vertexShader, this.vertexShaderCode);
		this.gl.compileShader(this.vertexShader);

		this.fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
		this.gl.shaderSource(this.fragmentShader, this.fragmentShaderCode);
		this.gl.compileShader(this.fragmentShader);

		// Create buffers
		this.vertexBuffer = this.gl.createBuffer();
		this.textureBuffer = this.gl.createBuffer();
		this.normalBuffer = this.gl.createBuffer();

		// Create texture and program
		this.texture = this.gl.createTexture();
		this.program = this.gl.createProgram();
		this.gl.attachShader(this.program, this.vertexShader);
		this.gl.attachShader(this.program, this.fragmentShader);
		this.gl.linkProgram(this.program);

		// Set initial light direction and shininess
		this.setLightDir(1.0, 1.0, 1.0);
		this.setShininess(100.0);

		this.numTriangles = 0;
	}

	setMesh(vertPos, texCoords, normals) {
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertPos), this.gl.STATIC_DRAW);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);

		this.numTriangles = vertPos.length / 3;
	}

	swapYZ(swap) {
		this.gl.useProgram(this.program);
		const uSwapYZLocation = this.gl.getUniformLocation(this.program, "uSwapYZ");
		this.gl.uniform1i(uSwapYZLocation, swap);
	}

	draw(matrixMVP, matrixMV, matrixNormal) {
		this.gl.useProgram(this.program);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
		const coord = this.gl.getAttribLocation(this.program, "coordinates");
		this.gl.vertexAttribPointer(coord, 3, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(coord);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
		const normal = this.gl.getAttribLocation(this.program, "normal");
		this.gl.vertexAttribPointer(normal, 3, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(normal);

		const transformationMatrixLocation = this.gl.getUniformLocation(this.program, "transformationMatrix");
		this.gl.uniformMatrix4fv(transformationMatrixLocation, false, matrixMVP);

		const modelViewMatrixLocation = this.gl.getUniformLocation(this.program, "modelViewMatrix");
		this.gl.uniformMatrix4fv(modelViewMatrixLocation, false, matrixMV);

		const normalMatrixLocation = this.gl.getUniformLocation(this.program, "normalMatrix");
		this.gl.uniformMatrix3fv(normalMatrixLocation, false, matrixNormal);

		const lightDirLocation = this.gl.getUniformLocation(this.program, "uLightDir");
		this.gl.uniform3fv(lightDirLocation, this.lightDir);

		// Bind the texture buffer to the ARRAY_BUFFER target of the WebGL context
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer);
		// Get the location of the texCoord attribute in the vertex shader
		const texCoordAttribLocation = this.gl.getAttribLocation(this.program, "texCoord");
		this.gl.vertexAttribPointer(texCoordAttribLocation, 2, this.gl.FLOAT, false, 0, 0);
		// Enable the vertex attribute array for the texture coordinates
		this.gl.enableVertexAttribArray(texCoordAttribLocation);

		// Bind the texture to the TEXTURE_2D target of the WebGL context
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		// Get the location of the uSampler uniform variable in the fragment shader
		const uSamplerLocation = this.gl.getUniformLocation(this.program, "uSampler");
		// Set the value of the uSampler uniform variable to 0
		this.gl.uniform1i(uSamplerLocation, 0);

		// Draw the mesh
		this.gl.drawArrays(this.gl.TRIANGLES, 0, this.numTriangles);
	}

	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) {
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, gl.REPEAT);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, gl.REPEAT);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, img);
	}

	// This method is called when the user changes the state of the
	// "Show Texture" checkbox.
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture(show) {
		this.gl.useProgram(this.program);
		const uTextureLocation = this.gl.getUniformLocation(this.program, "uTexture");
		this.gl.uniform1i(uTextureLocation, show);
	}

	// This method is called to set the incoming light direction
	setLightDir(x, y, z) {
		this.lightDir = [-x, -y, z];
	}

	// This method is called to set the shininess of the material
	setShininess(shininess) {
		this.gl.useProgram(this.program);
		const shininessLocation = this.gl.getUniformLocation(this.program, "uShininess");
		this.gl.uniform1f(shininessLocation, shininess);
	}
}

// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep(dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution) {
	// Iterate over each particle
	for (let i = 0; i < positions.length; i++) {
		// Apply gravity to each particle
		velocities[i].inc(gravity.mul(dt));

		// Update position using velocity
		positions[i].inc(velocities[i].mul(dt));

		// Apply damping to each particle
		velocities[i].mul(Math.pow(1 - damping, dt));
	}

	// Handle collisions with box walls
	for (let i = 0; i < positions.length; i++) {
		let pos = positions[i];

		// Collision with X-axis walls
		if (pos.x < -1) {
			pos.x = -1;
			velocities[i].x *= -restitution;
		} else if (pos.x > 1) {
			pos.x = 1;
			velocities[i].x *= -restitution;
		}

		// Collision with Y-axis walls
		if (pos.y < -1) {
			pos.y = -1;
			velocities[i].y *= -restitution;
		} else if (pos.y > 1) {
			pos.y = 1;
			velocities[i].y *= -restitution;
		}

		// Collision with Z-axis walls
		if (pos.z < -1) {
			pos.z = -1;
			velocities[i].z *= -restitution;
		} else if (pos.z > 1) {
			pos.z = 1;
			velocities[i].z *= -restitution;
		}
	}

	// Iterate over each spring
	for (let i = 0; i < springs.length; i++) {
		let spring = springs[i];
		let p0 = positions[spring.p0];
		let p1 = positions[spring.p1];

		// Compute displacement vector and its length
		let displacement = p1.sub(p0);
		let displacementLen = displacement.len();

		// Compute force due to spring
		let force = displacement.mul((displacementLen - spring.rest) * stiffness);

		// Apply force to both particles
		velocities[spring.p0].inc(force.mul(dt / particleMass));
		velocities[spring.p1].dec(force.mul(dt / particleMass));
	}
}

function computeSpringForces(positions, velocities, springs, stiffness, damping, forces) {
	// Iterate through springs
	for (const spring of springs) {
		const p0 = spring.p0;
		const p1 = spring.p1;
		const restLength = spring.rest;

		// Calculate displacement vector
		const displacement = positions[p1].sub(positions[p0]);
		const currentLength = displacement.len();

		// Calculate spring force using Hooke's law
		const springForce = displacement.unit().mul((currentLength - restLength) * stiffness);

		// Apply damping force
		const relativeVelocity = velocities[p1].sub(velocities[p0]);
		const dampingForce = relativeVelocity.mul(damping);

		// Apply forces to particles
		forces[p0] = forces[p0].add(springForce).sub(dampingForce);
		forces[p1] = forces[p1].sub(springForce).add(dampingForce);
	}
}

function computeGravityForces(gravity, particleMass, forces) {
	// Apply gravity to each particle
	for (let i = 0; i < forces.length; i++) {
		forces[i] = forces[i].add(gravity.mul(particleMass));
	}
}

function updateVelocities(dt, particleMass, forces, velocities) {
	// Update velocities using forces and Newton's second law (F = ma)
	for (let i = 0; i < velocities.length; i++) {
		const acceleration = forces[i].div(particleMass);
		velocities[i] = velocities[i].add(acceleration.mul(dt));
	}
}

function updatePositions(dt, velocities, positions) {
	// Update positions using velocities and a numerical integration method (Euler integration)
	for (let i = 0; i < positions.length; i++) {
		positions[i] = positions[i].add(velocities[i].mul(dt));
	}
}

function handleCollisions(positions, velocities, restitution) {
	const boxMin = -1;
	const boxMax = 1;

	for (let i = 0; i < positions.length; i++) {
		// Check for collisions with each dimension of the box
		for (let dim = 0; dim < 3; dim++) {
			if (positions[i][dim] < boxMin) {
				positions[i][dim] = boxMin;
				velocities[i][dim] *= -restitution;
			} else if (positions[i][dim] > boxMax) {
				positions[i][dim] = boxMax;
				velocities[i][dim] *= -restitution;
			}
		}
	}
}


