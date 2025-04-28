// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY ) {
	var cosx = Math.cos(rotationX), sinx = Math.sin(rotationX);
	var cosy = Math.cos(rotationY), siny = Math.sin(rotationY);
	// Rx
	var rx = [
		1,   0,    0, 0,
		0, cosx,-sinx,0,
		0, sinx, cosx,0,
		0,   0,    0, 1
	];
	// Ry
	var ry = [
		cosy, 0, siny, 0,
		0,  1,   0,  0,
		-siny, 0, cosy, 0,
		0,  0,   0,  1
	];
	// T
	var t = [
		1,0,0,0,
		0,1,0,0,
		0,0,1,0,
		translationX, translationY, translationZ, 1
	];
	// M = T * Ry * Rx
	var r  = MatrixMult(ry, rx);
	var mv = MatrixMult(t,  r);
	return mv;
}


// 2) The MeshDrawer with normals and Blinn shading
class MeshDrawer {
	constructor() {
		// --- Vertex Shader ---
		const vs = `
      attribute vec3 aPosition;
      attribute vec2 aTexCoord;
      attribute vec3 aNormal;
      uniform mat4  uMVP;
      uniform mat4  uMV;
      uniform mat3  uNormalMatrix;
      uniform bool uSwapYZ;
      varying vec2 vTex;
      varying vec3 vNorm;
      varying vec3 vPosEye;
      void main() {
        vec3 pos = aPosition;
        vec3 nrm = aNormal;
        if(uSwapYZ) {
          pos = vec3(pos.x, pos.z, pos.y);
          nrm = vec3(nrm.x, nrm.z, nrm.y);
        }
        // position in eye/camera space
        vec4 posEye4 = uMV * vec4(pos, 1.0);
        vPosEye = posEye4.xyz;
        // transformed normal
        vNorm = normalize(uNormalMatrix * nrm);
        gl_Position = uMVP * vec4(pos, 1.0);
        vTex = aTexCoord;
      }
    `;

		// --- Fragment Shader ---
		const fs = `
      precision mediump float;
      uniform sampler2D uSampler;
      uniform bool uShowTexture;
      uniform bool uHaveTexture;
      uniform vec3  uLightDir;   // in camera/eye space
      uniform float uShininess;
      varying vec2 vTex;
      varying vec3 vNorm;
      varying vec3 vPosEye;
      void main() {
        // normalize inputs
        vec3 N = normalize(vNorm);
        vec3 L = normalize(uLightDir);
        vec3 V = normalize(-vPosEye);
        vec3 H = normalize(L + V);

        // choose diffuse color
        vec3 Kd = vec3(1.0);
        if(uShowTexture && uHaveTexture) {
          Kd = texture2D(uSampler, vTex).rgb;
        }
        vec3 Ks = vec3(1.0);

        // ambient term (optional)
        vec3 ambient = 0.1 * Kd;

        // diffuse and specular
        float diff = max(dot(N, L), 0.0);
        float spec = 0.0;
        if(diff > 0.0) {
          spec = pow( max(dot(N, H), 0.0), uShininess );
        }

        vec3 color = ambient + Kd * diff + Ks * spec;
        gl_FragColor = vec4(color, 1.0);
      }
    `;

		// compile/link
		this.prog = InitShaderProgram(vs, fs);
		gl.useProgram(this.prog);

		// get all locations
		this.aPos    = gl.getAttribLocation(this.prog, 'aPosition');
		this.aTex    = gl.getAttribLocation(this.prog, 'aTexCoord');
		this.aNorm   = gl.getAttribLocation(this.prog, 'aNormal');
		this.uMVP    = gl.getUniformLocation(this.prog, 'uMVP');
		this.uMV     = gl.getUniformLocation(this.prog, 'uMV');
		this.uNorm   = gl.getUniformLocation(this.prog, 'uNormalMatrix');
		this.uSwapYZ = gl.getUniformLocation(this.prog, 'uSwapYZ');
		this.uShowT  = gl.getUniformLocation(this.prog, 'uShowTexture');
		this.uHaveT  = gl.getUniformLocation(this.prog, 'uHaveTexture');
		this.uSampler= gl.getUniformLocation(this.prog, 'uSampler');
		this.uLight  = gl.getUniformLocation(this.prog, 'uLightDir');
		this.uShiny  = gl.getUniformLocation(this.prog, 'uShininess');

		// create buffers
		this.vboPos  = gl.createBuffer();
		this.vboTex  = gl.createBuffer();
		this.vboNorm = gl.createBuffer();

		// state
		this.nVertex     = 0;
		this.swapYZflag  = false;
		this.showTexFlag = false;
		this.haveTexture = false;
		this.texture     = null;
		this.lightDir    = [0,0,1];
		this.shininess   = 32.0;
	}

	// upload positions, texcoords and normals
	setMesh( verts, texcoords, normals ) {
		this.nVertex = verts.length / 3;

		// positions
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPos);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

		// texcoords
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vboTex);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

		// normals
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vboNorm);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
	}

	swapYZ( flg ) {
		this.swapYZflag = flg;
	}

	setTexture(img) {
		// create/bind texture
		if(!this.texture) this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

		this.haveTexture = true;
	}

	showTexture(flg) {
		this.showTexFlag = flg;
	}

	setLightDir(x,y,z) {
		this.lightDir = [x,y,z];
	}

	setShininess(s) {
		this.shininess = s;
	}

	draw(mvp, mv, normalMat) {
		gl.useProgram(this.prog);

		// uniforms
		gl.uniformMatrix4fv(this.uMVP, false, mvp);
		gl.uniformMatrix4fv(this.uMV,  false, mv);
		gl.uniformMatrix3fv(this.uNorm,false, normalMat);
		gl.uniform1i(this.uSwapYZ, this.swapYZflag);
		gl.uniform1i(this.uShowT,  this.showTexFlag);
		gl.uniform1i(this.uHaveT,  this.haveTexture);
		gl.uniform3fv(this.uLight, this.lightDir);
		gl.uniform1f(this.uShiny,  this.shininess);

		// attributes
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vboPos);
		gl.enableVertexAttribArray(this.aPos);
		gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vboTex);
		gl.enableVertexAttribArray(this.aTex);
		gl.vertexAttribPointer(this.aTex, 2, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vboNorm);
		gl.enableVertexAttribArray(this.aNorm);
		gl.vertexAttribPointer(this.aNorm, 3, gl.FLOAT, false, 0, 0);

		// bind texture unit 0
		if(this.haveTexture && this.showTexFlag) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.uniform1i(this.uSampler, 0);
		}

		// draw!
		gl.drawArrays(gl.TRIANGLES, 0, this.nVertex);
	}
}
