// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
	// Compute sine and cosine for the rotation angles.
	var cosx = Math.cos(rotationX);
	var sinx = Math.sin(rotationX);
	var cosy = Math.cos(rotationY);
	var siny = Math.sin(rotationY);

	// Rotation around the x-axis:
	var rx = [
		1,    0,     0,    0,
		0,  cosx, -sinx,    0,
		0,  sinx,  cosx,    0,
		0,    0,     0,    1
	];

	// Rotation around the y-axis:
	var ry = [
		cosy,  0, siny, 0,
		0,   1,   0,  0,
		-siny,  0, cosy, 0,
		0,   0,   0,  1
	];

	// Translation matrix:
	var t = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	// Compose the model transformation: first rotate about x, then y, and finally translate.
	// Matrix order: M = T * (ry * rx)
	var r = MatrixMult(ry, rx);  // apply rotation around x first, then y
	var m = MatrixMult(t, r);    // then translate the rotated model

	// Finally, combine with the projection:
	var mvp = MatrixMult(projectionMatrix, m);
	return mvp;
}

class MeshDrawer {
	// The constructor handles WebGL initializations for rendering the mesh.
	constructor() {
		// Compile the shaders for mesh drawing.
		// The shader sources are defined inline.
		var vsSource = `
            attribute vec3 aPosition;
            attribute vec2 aTexCoord;
            uniform mat4 mvp;
            uniform bool uSwapYZ;
            varying vec2 vTexCoord;
            void main(void) {
                vec3 pos = aPosition;
                if(uSwapYZ) {
                    pos = vec3(pos.x, pos.z, pos.y);
                }
                gl_Position = mvp * vec4(pos, 1.0);
                vTexCoord = aTexCoord;
            }
        `;
		var fsSource = `
            precision mediump float;
            uniform sampler2D uSampler;
            uniform bool uShowTexture;
            varying vec2 vTexCoord;
            void main(void) {
                if(uShowTexture) {
                    gl_FragColor = texture2D(uSampler, vTexCoord);
                } else {
                    gl_FragColor = vec4(1.0, gl_FragCoord.z * gl_FragCoord.z, 0.0, 1.0);
                }
            }
        `;

		// Initialize the shader program (using the helper function defined in project4.html)
		this.program = InitShaderProgram(vsSource, fsSource);
		gl.useProgram(this.program);

		// Get attribute and uniform locations.
		this.aPosition = gl.getAttribLocation(this.program, 'aPosition');
		this.aTexCoord = gl.getAttribLocation(this.program, 'aTexCoord');
		this.mvpLocation = gl.getUniformLocation(this.program, 'mvp');
		this.uSwapYZ = gl.getUniformLocation(this.program, 'uSwapYZ');
		this.uShowTexture = gl.getUniformLocation(this.program, 'uShowTexture');
		this.uSampler = gl.getUniformLocation(this.program, 'uSampler');

		// Create buffer objects for vertex positions and texture coordinates.
		this.vertexBuffer = gl.createBuffer();
		this.texCoordBuffer = gl.createBuffer();

		// Initialize flags.
		this.swapYZFlag = false;
		this.showTextureFlag = true;
		this.texture = null;
		this.numVertices = 0;
	}

	// This method is called every time the user loads an OBJ file.
	// The `vertPos` is an array of 3D positions and `texCoords` is an array of 2D texture coordinates.
	setMesh(vertPos, texCoords) {
		// Bind and load vertex positions.
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
		// Compute the number of vertices (each vertex has 3 components).
		this.numVertices = vertPos.length / 3;

		// Bind and load texture coordinates.
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	}

	// Toggle the swap–YZ flag; the vertex shader will use this to swap the y and z coordinates.
	swapYZ(swap) {
		this.swapYZFlag = swap;
	}

	// Draw the mesh using the provided transformation (mvp).
	draw(trans) {
		// Use our shader program.
		gl.useProgram(this.program);
		// Set the transformation uniform.
		gl.uniformMatrix4fv(this.mvpLocation, false, trans);
		// Pass the swapYZ flag to the shader.
		gl.uniform1i(this.uSwapYZ, this.swapYZFlag);
		// Pass the showTexture flag; if no texture is loaded, the shader will fall back on the alternative color.
		gl.uniform1i(this.uShowTexture, (this.showTextureFlag && this.texture !== null));

		// Enable and bind the vertex buffer for positions.
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.aPosition);

		// Enable and bind the texture coordinate buffer.
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
		gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.aTexCoord);

		// If we have a texture and texturing is enabled, set it up.
		if(this.texture && this.showTextureFlag) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.uniform1i(this.uSampler, 0);
		}

		// Finally, issue the draw call. We use TRIANGLES and the number of vertices.
		gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
	}

	// Bind the texture provided by the user.
	setTexture(img) {
		if (!this.texture) {
			this.texture = gl.createTexture();
		}
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

		// Set texture filtering
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		// Use REPEAT wrap mode for both S and T directions.
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	}


	// Set whether the texture should be displayed.
	showTexture(show) {
		this.showTextureFlag = show;
	}
}
