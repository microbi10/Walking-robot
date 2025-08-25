#version 430

// pipeline-ból bejövő per-fragment attribútumok 
in vec3 worldPosition;
in vec3 worldNormal;
in vec2 textureCoords;

// kimenő érték - a fragment színe 
out vec4 outputColor;

uniform int objectTypeID;	//0 - default, 1 - tableTop, 2 - robot

// textúra mintavételező objektum 
uniform sampler2D textureImage;
uniform sampler2D shineTexture;

uniform vec3 cameraPosition;

// fényforrás tulajdonságok 
uniform vec4 lightPosition = vec4( 1/3.0, 2/3.0, 2/3.0, 0.0);

uniform vec3 La = vec3(0.1, 0.1, 0.1 );
uniform vec3 Ld = vec3(1.0, 1.0, 1.0 );
uniform vec3 Ls = vec3(1.0, 1.0, 1.0 );

uniform float lightConstantAttenuation    = 1.0;
uniform float lightLinearAttenuation      = 0.0;
uniform float lightQuadraticAttenuation   = 0.025;

// anyag tulajdonságok 

uniform vec3 Ka = vec3( 1.0 );
uniform vec3 Kd = vec3( 1.0 );
uniform vec3 Ks = vec3( 1.0 );

uniform float Shininess = 20.0;

/* segítség:  normalizálás:  http://www.opengl.org/sdk/docs/manglsl/xhtml/normalize.xml
	- skaláris szorzat:   http://www.opengl.org/sdk/docs/manglsl/xhtml/dot.xml
	- clamp: http://www.opengl.org/sdk/docs/manglsl/xhtml/clamp.xml
	- reflect: http://www.opengl.org/sdk/docs/manglsl/xhtml/reflect.xml
			 reflect(beérkező_vektor, normálvektor);  pow(alap, kitevő); 
*/

struct LightProperties
{
	vec4 pos;
	vec3 La;
	vec3 Ld;
	vec3 Ls;
	float constantAttenuation;
	float linearAttenuation;
	float quadraticAttenuation;
};

struct MaterialProperties
{
	vec3 Ka;
	vec3 Kd;
	vec3 Ks;
	float Shininess;
};

vec3 lighting(LightProperties light, vec3 position, vec3 normal, MaterialProperties material)
{	
	//kulonbozo fenyforrasok:
		//directional
		//points

	float lightDistance = 0.0;

	//feny fele mutato vektor
	vec3 toLight;
	if(light.pos.w == 0) {
		//directional => fenybe mutato irany van eltarolva
		toLight = light.pos.xyz;
	} else {
		//point => fenypont van eltarolva
		toLight = light.pos.xyz - position;
		lightDistance = length(toLight);	//distance(light.pos.xyz - position);
	}

	toLight = normalize(toLight);

	//attenuation => feny elhalas
	float attenuation = 1.0 / (
		light.constantAttenuation + 
		light.linearAttenuation * lightDistance + 
		light.quadraticAttenuation * lightDistance * lightDistance
	);

	//ambiens -> komponensenkenti szorzas
	vec3 ambient = light.La *  material.Ka;
	
	//diffuse
	float diffuseFactor = max(dot(toLight, normal), 0.0) * attenuation;
	vec3 diffuse = diffuseFactor * light.Ld * material.Kd;

	//specular
	vec3 viewDir = normalize(cameraPosition - position);
	vec3 reflectDir = reflect(-toLight, normal);
	float specularFactor = pow(max(0, dot(viewDir, reflectDir)), material.Shininess) * attenuation;
	vec3 specular = specularFactor * light.Ls * material.Ks;



	return ambient + diffuse + specular;
}

void main()
{
	LightProperties light;
	light.pos = lightPosition;
	light.La = La;
	light.Ld = Ld;
	light.Ls = Ls;
	light.constantAttenuation = lightConstantAttenuation;
	light.linearAttenuation = lightLinearAttenuation;
	light.quadraticAttenuation = lightQuadraticAttenuation;

	MaterialProperties material;
	material.Ka = Ka;
	material.Kd = Kd;
	material.Ks = Ks;
	material.Shininess = Shininess;

	if(objectTypeID == 2) {
		float shineVal = texture(shineTexture, textureCoords).r;

		if(shineVal == 0) {
			material.Ks = vec3(0);
		} else {
			material.Shininess = 16.0 * shineVal;
		}
	}


	vec3 normal = normalize(worldNormal);

	vec3 shadedColor = lighting(light, worldPosition, normal, material);

	light.pos = vec4(0.0, 1.0, 0.0, 0.0);
	light.Ld = vec3(0.1, 0.3, 0.7);
	shadedColor += lighting(light, worldPosition, normal, material);

	vec4 tex = texture(textureImage, textureCoords);

	if(objectTypeID == 1) {
		float u = textureCoords.x, v = textureCoords.y;
		int val = int(floor(8*u) + floor(8*v));	

		if(val % 2 == 1) {
			tex *= 0.8;
		}
	}

	outputColor = vec4(shadedColor, 1) * tex;

	//outputColor = vec4(normal, 1);
}

