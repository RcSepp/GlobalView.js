/**
 * Blocks of GLSL shader code. Blocks starting with vs... are vertex shaders, blocks starting with fs... are fragment shaders
 * @summary Vertex- and fragment shader code
 * @package
 * @namespace
*/
var Shaders = {};

/** 
 * @summary A simple vertex shader for meshes with positions and texture coordinates.
 * @static
 * @readonly
*/
Shaders.vsSimple =
`attribute vec3 vpos;
attribute vec2 vtexcoord;
uniform mat4 matWorldViewProj;
varying vec2 uv;

void main()
{
	gl_Position = matWorldViewProj * vec4(vpos, 1.0);
	uv = vtexcoord;
}
`;
Shaders.fsLine =
`precision mediump float;
uniform vec4 color;

void main()
{
	gl_FragColor = color;
}
`;
Shaders.vsTextured =
`attribute vec3 vpos;
attribute vec2 vtexcoord;
uniform mat4 matWorldViewProj;
varying vec2 uv;

void main()
{
	gl_Position = matWorldViewProj * vec4(vpos, 1.0);
	uv = vtexcoord;
}
`;
Shaders.vsTextured2 =
`attribute vec3 vpos;
attribute vec2 vtexcoord;
uniform mat4 matWorldViewProj;
uniform mat2 matTexCoordTransform;
varying vec2 uv;

void main()
{
	gl_Position = matWorldViewProj * vec4(vpos, 1.0);
	uv = matTexCoordTransform * vtexcoord;
}
`;
Shaders.fsTextured =
`precision mediump float;
varying vec2 uv;
uniform sampler2D uSampler;

void main()
{
	gl_FragColor = texture2D(uSampler, uv);
}
`;
Shaders.fsTextured1D =
`precision mediump float;
varying vec2 uv;
uniform sampler2D uSampler;

void main()
{
	gl_FragColor = texture2D(uSampler, vec2(uv.y, 0.5));
}
`;
Shaders.fsViewDensityMap =
`precision mediump float;
varying vec2 uv;
uniform float scale;
uniform vec3 color;
uniform sampler2D uSamplers[2];

void main()
{
	float depth = texture2D(uSamplers[0], uv).r * scale;
	//gl_FragColor = vec4(texture2D(uSamplers[1], vec2(depth, 0.5)).rgb, 1.0);
	gl_FragColor = vec4(color, depth);
}
`;

Shaders.vsDataPoint =
`uniform sampler2D uSampler;
uniform float pointOpacity, pointSize;
uniform bool flipY;
varying vec4 color;

void main()
{
	vec3 pos = getPos();
	color = texture2D(uSampler, vec2(pos.z, 0.5));
	color.a *= pointOpacity;
	gl_Position = vec4(pos.x, flipY ? -pos.y : pos.y, 0.0, 1.0);
	gl_PointSize = pointSize;
}
`;
Shaders.fsDataPoint =
`varying vec4 color;

void main()
{
	//float t = clamp(1.0 - length(gl_PointCoord * 2.0 - 1.0), 0.0, 1.0);
	gl_FragColor = vec4(color.rgb, color.a * clamp(opacityMap(gl_PointCoord * 2.0 - 1.0), 0.0, 1.0));
}
`;
Shaders.vsDataLine =
`uniform sampler2D uSampler;
uniform float pointOpacity, pointSize;
uniform bool flipY;
uniform mat2 lineTransform;
attribute vec2 lineOffset;
varying vec4 color;

void main()
{
	vec4 pos = getPos();
	color = texture2D(uSampler, vec2(pos.z, 0.5));
	color.a *= pointOpacity;
	gl_Position = vec4(pos.x, flipY ? -pos.y : pos.y, 0.0, 1.0) + vec4(lineOffset * vec2(pos.w, 1.0) * lineTransform, 0.0, 0.0);
	gl_PointSize = pointSize;
}
`;
Shaders.fsDataLine =
`varying vec4 color;

void main()
{
	gl_FragColor = color;
}
`;
Shaders.vsDensityMap =
`void main()
{
	vec3 pos = getPos();
	gl_Position = vec4(pos.xy, 0.0, 1.0);
	gl_PointSize = 1.0;
}
`;
Shaders.fsDensityMap =
`precision highp float;

void main()
{
	gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
`;
Shaders.vsBlurDensityMap =
`attribute vec3 vpos;
attribute vec2 vtexcoord;
varying vec2 uv;

void main()
{
	gl_Position = vec4(vpos, 1.0);
	uv = vtexcoord;
}
`;
Shaders.fsBlurDensityMap =
`precision highp float;
varying vec2 uv;
uniform sampler2D uSampler;
uniform vec2 pixelSize;
uniform float gauss[33 * 33];

vec4 pack_float(float value)
{
	value = clamp(value, 0.0, 1.0);
	return vec4(value, mod(value * 256.0, 256.0 / 255.0), mod(value * 65536.0, 256.0 / 255.0), 1.0);
	
	/*value = clamp(value, 0.0, 1.0);
	if(value <= 1e-5)
		return vec4(0.0, 0.0, 0.0, 1.0);
	value = value * 16777214.0 - 1.0;
	return vec4(mod(value / 65536.0, 255.0) / 255.0, mod(value / 256.0, 255.0) / 255.0, mod(value / 1.0, 255.0) / 255.0, 1.0);*/
}
float unpack_float(vec4 rgba)
{
	float value = floor(rgba.r * 255.0) * 65536.0 + floor(rgba.g * 255.0) * 256.0 + floor(rgba.b * 255.0);
	value = value / 16777215.0; // 16777215.0 == float(0xffffff)
	value = clamp(value, 0.0, 1.0);
	return value;
	
	
	/*if(rgba.a <= 1e-5)
		return -1e20;
	float valueI = floor(rgba.r * 255.0) * 65536.0 + floor(rgba.g * 255.0) * 256.0 + floor(rgba.b * 255.0);
	if(valueI < 0.5)
		return -1e20;
	float valueS = (valueI - 1.0) / 16777214.0; // 0 is reserved as 'nothing' //float(0xfffffe)
	valueS = clamp(valueS, 0.0, 1.0);
	return valueS;*/
}

void main()
{
	float c = 0.0;
	for (int y = -16; y <= 16; ++y)
		for (int x = -16; x <= 16; ++x)
			c += unpack_float(texture2D(uSampler, uv + pixelSize * vec2(x, y))) * gauss[(y + 16) * 33 + x + 16];
	gl_FragColor = pack_float(c);
}
`;