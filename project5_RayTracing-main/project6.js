var raytraceFS = /*glsl*/ `
struct Ray {
    vec3 pos;
    vec3 dir;
};

struct Material {
    vec3  k_d;    // diffuse coefficient
    vec3  k_s;    // specular coefficient
    float n;    // specular exponent
};

struct Sphere {
    vec3     center;
    float    radius;
    Material mtl;
};

struct Light {
    vec3 position;
    vec3 intensity;
};

struct HitInfo {
    float    t;
    vec3     position;
    vec3     normal;
    Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
    vec3 color = vec3(0,0,0);
    for ( int i=0; i<NUM_LIGHTS; ++i ) {
        // TO-DO: Check for shadows
        Ray shadowRay;
        shadowRay.pos = position;
        shadowRay.dir = normalize(lights[i].position - position);

        HitInfo shadowHit;
        bool shadowed = IntersectRay(shadowHit, shadowRay);

        // TO-DO: If not shadowed, perform shading using the Blinn model
        if (!shadowed || (shadowHit.t > distance(position, lights[i].position))) {
            vec3 L = normalize(lights[i].position - position);
            vec3 H = normalize(L + view);
            float diffuse = max(0.0, dot(normal, L));
            float specular = pow(max(0.0, dot(normal, H)), mtl.n);
            color += diffuse * mtl.k_d * lights[i].intensity + specular * mtl.k_s * lights[i].intensity;
        }
    }
    return color;
}

// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
    hit.t = 1e30;
    bool foundHit = false;
    for ( int i=0; i<NUM_SPHERES; ++i ) {
        vec3 oc = ray.pos - spheres[i].center;
        float a = dot(ray.dir, ray.dir);
        float b = 2.0 * dot(oc, ray.dir);
        float c = dot(oc, oc) - spheres[i].radius * spheres[i].radius;
        float discriminant = b * b - 4.0 * a * c;
        if (discriminant > 0.0) {
            float t1 = (-b - sqrt(discriminant)) / (2.0 * a);
            float t2 = (-b + sqrt(discriminant)) / (2.0 * a);
            float t = min(t1, t2);
            if (t > 0.0 && t < hit.t) {
                hit.t = t;
                hit.position = ray.pos + t * ray.dir;
                hit.normal = normalize(hit.position - spheres[i].center);
                hit.mtl = spheres[i].mtl;
                foundHit = true;
            }
        }
    }
    return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
    HitInfo hit;
	hit.t = 1e30;

    if ( IntersectRay( hit, ray ) ) {
        vec3 view = normalize( -ray.dir );
        vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
        
        // Compute reflections
        vec3 k_s = hit.mtl.k_s;
        for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
            if ( bounce >= bounceLimit ) break;
            if ( hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0 ) break;
            
            Ray r;    // reflection ray
            HitInfo h;    // reflection hit info
            
            // TO-DO: Initialize the reflection ray
            r.pos = hit.position;
            r.dir = reflect(ray.dir, hit.normal);
            
            if ( IntersectRay( h, r ) ) {
                // TO-DO: Hit found, so shade the hit point
                clr += k_s * Shade(h.mtl, h.position, h.normal, -r.dir);
                
                // TO-DO: Update the loop variables for tracing the next reflection ray
                ray.pos = hit.position;
            	ray.dir = r.dir;
				hit = h;

            } else {
                // The refleciton ray did not intersect with anything,
                // so we are using the environment color
                clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
                break;    // no more reflections
            }
        }
        return vec4( clr, 1 ); // return the accumulated color, including the reflections
    } else {
        return vec4( textureCube( envMap, normalize(ray.dir).xzy ).rgb, 1.0 ); // return the environment color
    }
}
`;