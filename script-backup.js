// Catmull-Rom spline interpolation for smooth curves
function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    
    return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
}

// Random number generator
class RNG {
    constructor(seed) {
        this.seed = seed;
    }
    
    random() {
        this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
        return this.seed / 4294967296;
    }
}

function generateIrregularEllipse(radiusX = 280, radiusY = 180, irregularity = 0.7, numControlPoints = 12) {
    const rng = new RNG(irregularSeed);
    
    // Generate control points around an ellipse with random perturbations
    const controlPoints = [];
    
    for (let i = 0; i < numControlPoints; i++) {
        const angle = (i / numControlPoints) * Math.PI * 2;
        
        // Base ellipse radius at this angle
        const baseRadius = Math.sqrt(
            (radiusX * Math.cos(angle)) ** 2 + 
            (radiusY * Math.sin(angle)) ** 2
        );
        
        // Add random perturbation
        const perturbation = (rng.random() - 0.5) * 2 * irregularity;
        const radius = baseRadius * (1 + perturbation);
        
        controlPoints.push({
            x: Math.cos(angle) * radius + canvas.width / 2,
            y: Math.sin(angle) * radius + canvas.height / 2
        });
    }
    
    return { controlPoints, boundary: interpolateBoundary(controlPoints) };
}

function interpolateBoundary(controlPoints) {
    // Interpolate smooth curve through control points using Catmull-Rom spline
    const numPoints = 512;
    const x = [];
    const y = [];
    const numControlPoints = controlPoints.length;
    
    for (let i = 0; i < numPoints; i++) {
        const t = i / numPoints;
        const segment = t * numControlPoints;
        const index = Math.floor(segment);
        const localT = segment - index;
        
        // Get four control points for Catmull-Rom interpolation
        const p0 = controlPoints[(index - 1 + numControlPoints) % numControlPoints];
        const p1 = controlPoints[index % numControlPoints];
        const p2 = controlPoints[(index + 1) % numControlPoints];
        const p3 = controlPoints[(index + 2) % numControlPoints];
        
        x.push(catmullRom(p0.x, p1.x, p2.x, p3.x, localT));
        y.push(catmullRom(p0.y, p1.y, p2.y, p3.y, localT));
    }
    
    return { x, y };
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const playPauseBtn = document.getElementById('playPause');
const resetBtn = document.getElementById('reset');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const particleCountInput = document.getElementById('particleCount');
const shapeSelect = document.getElementById('shapeSelect');
const ellipseControls = document.getElementById('ellipseControls');
const ellipseWidthSlider = document.getElementById('ellipseWidth');
const ellipseHeightSlider = document.getElementById('ellipseHeight');
const widthValue = document.getElementById('widthValue');
const heightValue = document.getElementById('heightValue');
const irregularControls = document.getElementById('irregularControls');
const irregularAmplitudeSlider = document.getElementById('irregularAmplitude');
const amplitudeValue = document.getElementById('amplitudeValue');
const regenerateIrregularBtn = document.getElementById('regenerateIrregular');
const controlPointsCountInput = document.getElementById('controlPointsCount');

let currentShape = 'rectangle';
const circleCenter = { x: canvas.width / 2, y: canvas.height / 2 };
const circleRadius = Math.min(canvas.width, canvas.height) / 2 - 20;

let ellipseCenter = { x: canvas.width / 2, y: canvas.height / 2 };
let ellipseRadiusX = 300; // Semi-major axis
let ellipseRadiusY = 200; // Semi-minor axis

let irregularBoundary = { x: [], y: [] };
let irregularControlPoints = [];
let irregularAmplitude = 0.7;
let irregularSeed = 42;
let irregularControlPointsCount = 12;
let draggedPointIndex = -1;
let isMouseDown = false;

let particles = [];
let speed = 3;
let isPlaying = true;
let animationId;

const colors = [
    '#e94560', '#ff6b6b', '#ee5a6f', '#ff4757', '#ff6348',
    '#ff7979', '#eb4d4b', '#f368e0', '#ff9ff3', '#feca57'
];

function getRandomEdgePosition() {
    if (currentShape === 'circle') {
        // Random angle on the circle's edge
        const angle = Math.random() * Math.PI * 2;
        const x = circleCenter.x + Math.cos(angle) * circleRadius;
        const y = circleCenter.y + Math.sin(angle) * circleRadius;
        
        // Direction pointing inward (add PI to flip direction)
        const inwardAngle = angle + Math.PI + (Math.random() - 0.5) * Math.PI; // Random variation
        
        return { x, y, angle: inwardAngle };
    } else if (currentShape === 'ellipse') {
        // Random angle on the ellipse's edge
        const angle = Math.random() * Math.PI * 2;
        const x = ellipseCenter.x + Math.cos(angle) * ellipseRadiusX;
        const y = ellipseCenter.y + Math.sin(angle) * ellipseRadiusY;
        
        // Direction pointing inward with random variation
        const inwardAngle = angle + Math.PI + (Math.random() - 0.5) * Math.PI;
        
        return { x, y, angle: inwardAngle };
    } else if (currentShape === 'irregular') {
        // Random point on irregular boundary
        const idx = Math.floor(Math.random() * irregularBoundary.x.length);
        const x = irregularBoundary.x[idx];
        const y = irregularBoundary.y[idx];
        
        // Calculate inward direction
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const angle = Math.atan2(y - cy, x - cx) + Math.PI + (Math.random() - 0.5) * Math.PI;
        
        return { x, y, angle };
    } else {
        // Rectangle logic (original)
        const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        let x, y, angle;
        
        switch(edge) {
            case 0: // Top edge
                x = Math.random() * canvas.width;
                y = 0;
                angle = Math.random() * Math.PI; // Angle pointing downward (0 to PI)
                break;
            case 1: // Right edge
                x = canvas.width;
                y = Math.random() * canvas.height;
                angle = Math.PI / 2 + Math.random() * Math.PI; // Angle pointing left
                break;
            case 2: // Bottom edge
                x = Math.random() * canvas.width;
                y = canvas.height;
                angle = Math.PI + Math.random() * Math.PI; // Angle pointing upward
                break;
            case 3: // Left edge
                x = 0;
                y = Math.random() * canvas.height;
                angle = -Math.PI / 2 + Math.random() * Math.PI; // Angle pointing right
                break;
        }
        
        return { x, y, angle };
    }
}

function initParticle() {
    const n = parseInt(particleCountInput.value) || 1;
    particles = [];
    
    // Generate irregular boundary if needed
    if (currentShape === 'irregular' && irregularBoundary.x.length === 0) {
        const result = generateIrregularEllipse(280, 180, irregularAmplitude, irregularControlPointsCount);
        irregularBoundary = result.boundary;
        irregularControlPoints = result.controlPoints;
    }
    
    const pos = getRandomEdgePosition();
    const spacing = 2; // Very close spacing between particles
    
    // Calculate offset to center the group
    const totalWidth = (n - 1) * spacing;
    
    if (currentShape === 'circle') {
        // For circle, place particles along the arc
        const baseAngle = Math.atan2(pos.y - circleCenter.y, pos.x - circleCenter.x);
        const angleSpacing = spacing / circleRadius; // Convert linear spacing to angular
        
        for (let i = 0; i < n; i++) {
            const angle = baseAngle + (i * angleSpacing) - (n - 1) * angleSpacing / 2;
            const x = circleCenter.x + Math.cos(angle) * circleRadius;
            const y = circleCenter.y + Math.sin(angle) * circleRadius;
            
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(pos.angle) * speed,
                vy: Math.sin(pos.angle) * speed,
                radius: 6,
                color: colors[i % colors.length],
                path: [{ x: x, y: y }]
            });
        }
    } else if (currentShape === 'ellipse') {
        // For ellipse, place particles along the arc
        const baseAngle = Math.atan2((pos.y - ellipseCenter.y) / ellipseRadiusY, (pos.x - ellipseCenter.x) / ellipseRadiusX);
        const avgRadius = (ellipseRadiusX + ellipseRadiusY) / 2;
        const angleSpacing = spacing / avgRadius;
        
        for (let i = 0; i < n; i++) {
            const angle = baseAngle + (i * angleSpacing) - (n - 1) * angleSpacing / 2;
            const x = ellipseCenter.x + Math.cos(angle) * ellipseRadiusX;
            const y = ellipseCenter.y + Math.sin(angle) * ellipseRadiusY;
            
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(pos.angle) * speed,
                vy: Math.sin(pos.angle) * speed,
                radius: 6,
                color: colors[i % colors.length],
                path: [{ x: x, y: y }]
            });
        }
    } else if (currentShape === 'irregular') {
        // For irregular, place particles close together at starting position
        for (let i = 0; i < n; i++) {
            const offsetX = (i * spacing) - (totalWidth / 2);
            
            particles.push({
                x: pos.x + offsetX,
                y: pos.y,
                vx: Math.cos(pos.angle) * speed,
                vy: Math.sin(pos.angle) * speed,
                radius: 6,
                color: colors[i % colors.length],
                path: [{ x: pos.x + offsetX, y: pos.y }]
            });
        }
    } else {
        // Rectangle logic (original)
        let isHorizontalEdge = (pos.y === 0 || pos.y === canvas.height);
        
        for (let i = 0; i < n; i++) {
            let offsetX = 0;
            let offsetY = 0;
            
            if (isHorizontalEdge) { // Top or bottom edge
                offsetX = (i * spacing) - (totalWidth / 2);
            } else { // Left or right edge
                offsetY = (i * spacing) - (totalWidth / 2);
            }
            
            particles.push({
                x: pos.x + offsetX,
                y: pos.y + offsetY,
                vx: Math.cos(pos.angle) * speed,
                vy: Math.sin(pos.angle) * speed,
                radius: 6,
                color: colors[i % colors.length],
                path: [{ x: pos.x + offsetX, y: pos.y + offsetY }]
            });
        }
    }
}

function drawParticles() {
    particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
        
        // Add a glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = particle.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

function drawControlPoints() {
    if (currentShape !== 'irregular') return;
    
    irregularControlPoints.forEach((point, index) => {
        // Draw control point
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = draggedPointIndex === index ? '#f39c12' : '#2196F3';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw lines connecting control points
        if (index < irregularControlPoints.length - 1) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            const nextPoint = irregularControlPoints[index + 1];
            ctx.lineTo(nextPoint.x, nextPoint.y);
            ctx.strokeStyle = 'rgba(33, 150, 243, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            // Connect last point to first
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(irregularControlPoints[0].x, irregularControlPoints[0].y);
            ctx.strokeStyle = 'rgba(33, 150, 243, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    });
}

function drawPaths() {
    particles.forEach(particle => {
        if (particle.path.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(particle.path[0].x, particle.path[0].y);
        
        for (let i = 1; i < particle.path.length; i++) {
            ctx.lineTo(particle.path[i].x, particle.path[i].y);
        }
        
        ctx.strokeStyle = 'rgba(255, 223, 0, 0.8)';
        ctx.lineWidth = 4;
        ctx.stroke();
    });
}

function updateParticles() {
    particles.forEach(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        if (currentShape === 'circle') {
            // Check collision with circular wall
            const dx = particle.x - circleCenter.x;
            const dy = particle.y - circleCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance + particle.radius >= circleRadius) {
                // Normalize the vector from center to particle (this is the normal)
                const nx = dx / distance;
                const ny = dy / distance;
                
                // Reflect velocity across the normal
                const dot = particle.vx * nx + particle.vy * ny;
                particle.vx = particle.vx - 2 * dot * nx;
                particle.vy = particle.vy - 2 * dot * ny;
                
                // Push particle back inside
                const overlap = distance + particle.radius - circleRadius;
                particle.x -= nx * overlap;
                particle.y -= ny * overlap;
            }
        } else if (currentShape === 'ellipse') {
            // Check collision with ellipse wall
            const dx = particle.x - ellipseCenter.x;
            const dy = particle.y - ellipseCenter.y;
            
            // Ellipse equation: (x/a)^2 + (y/b)^2 = 1
            const ellipseValue = (dx * dx) / (ellipseRadiusX * ellipseRadiusX) + 
                                (dy * dy) / (ellipseRadiusY * ellipseRadiusY);
            
            if (ellipseValue >= 1.0) { // At or outside the boundary
                // Calculate normal at this point using gradient
                // Gradient: (x/a^2, y/b^2)
                let nx = dx / (ellipseRadiusX * ellipseRadiusX);
                let ny = dy / (ellipseRadiusY * ellipseRadiusY);
                
                // Normalize the normal vector
                const normalLength = Math.sqrt(nx * nx + ny * ny);
                nx = nx / normalLength;
                ny = ny / normalLength;
                
                // Reflect velocity across the normal
                const dot = particle.vx * nx + particle.vy * ny;
                particle.vx = particle.vx - 2 * dot * nx;
                particle.vy = particle.vy - 2 * dot * ny;
                
                // Scale position back to ellipse surface
                const scale = Math.sqrt(ellipseValue);
                particle.x = ellipseCenter.x + (dx / scale) * 0.99; // Slightly inside
                particle.y = ellipseCenter.y + (dy / scale) * 0.99;
            }
        } else if (currentShape === 'irregular') {
            // Check collision with irregular boundary
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            
            // Get particle's angle from center
            const particleAngle = Math.atan2(particle.y - cy, particle.x - cx);
            const particleDist = Math.sqrt((particle.x - cx) ** 2 + (particle.y - cy) ** 2);
            
            // Find the boundary point at approximately the same angle
            let closestIdx = 0;
            let minAngleDiff = Infinity;
            
            for (let i = 0; i < irregularBoundary.x.length; i++) {
                const boundaryAngle = Math.atan2(
                    irregularBoundary.y[i] - cy,
                    irregularBoundary.x[i] - cx
                );
                let angleDiff = Math.abs(particleAngle - boundaryAngle);
                // Handle angle wrapping
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                
                if (angleDiff < minAngleDiff) {
                    minAngleDiff = angleDiff;
                    closestIdx = i;
                }
            }
            
            const boundaryDist = Math.sqrt(
                (irregularBoundary.x[closestIdx] - cx) ** 2 + 
                (irregularBoundary.y[closestIdx] - cy) ** 2
            );
            
            // Particle is outside if its distance from center exceeds boundary distance
            if (particleDist >= boundaryDist - particle.radius) {
                // Calculate tangent vector from neighboring boundary points
                const range = 5;
                const prev = (closestIdx - range + irregularBoundary.x.length) % irregularBoundary.x.length;
                const next = (closestIdx + range) % irregularBoundary.x.length;
                
                const tx = irregularBoundary.x[next] - irregularBoundary.x[prev];
                const ty = irregularBoundary.y[next] - irregularBoundary.y[prev];
                
                // Normal is perpendicular to tangent (rotate tangent by 90 degrees)
                let nx = -ty;
                let ny = tx;
                
                // Normalize the normal vector
                const normalLength = Math.sqrt(nx * nx + ny * ny);
                nx /= normalLength;
                ny /= normalLength;
                
                // Ensure normal points inward (toward center)
                const dx = cx - irregularBoundary.x[closestIdx];
                const dy = cy - irregularBoundary.y[closestIdx];
                
                if (nx * dx + ny * dy < 0) {
                    nx = -nx;
                    ny = -ny;
                }
                
                // Reflect velocity across the normal
                const dot = particle.vx * nx + particle.vy * ny;
                particle.vx = particle.vx - 2 * dot * nx;
                particle.vy = particle.vy - 2 * dot * ny;
                
                // Move particle back inside the boundary
                const targetDist = boundaryDist - particle.radius * 2;
                const scale = targetDist / particleDist;
                particle.x = cx + (particle.x - cx) * scale;
                particle.y = cy + (particle.y - cy) * scale;
            }
        } else {
            // Rectangle collision (original logic)
            if (particle.x - particle.radius <= 0 || particle.x + particle.radius >= canvas.width) {
                particle.vx = -particle.vx;
                particle.x = Math.max(particle.radius, Math.min(canvas.width - particle.radius, particle.x));
            }
            
            if (particle.y - particle.radius <= 0 || particle.y + particle.radius >= canvas.height) {
                particle.vy = -particle.vy;
                particle.y = Math.max(particle.radius, Math.min(canvas.height - particle.radius, particle.y));
            }
        }
        
        // Add current position to path
        particle.path.push({ x: particle.x, y: particle.y });
    });
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the table boundary
    if (currentShape === 'circle') {
        ctx.beginPath();
        ctx.arc(circleCenter.x, circleCenter.y, circleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#16213e';
        ctx.lineWidth = 3;
        ctx.stroke();
    } else if (currentShape === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(ellipseCenter.x, ellipseCenter.y, ellipseRadiusX, ellipseRadiusY, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#16213e';
        ctx.lineWidth = 3;
        ctx.stroke();
    } else if (currentShape === 'irregular') {
        ctx.beginPath();
        ctx.moveTo(irregularBoundary.x[0], irregularBoundary.y[0]);
        for (let i = 1; i < irregularBoundary.x.length; i++) {
            ctx.lineTo(irregularBoundary.x[i], irregularBoundary.y[i]);
        }
        ctx.closePath();
        ctx.strokeStyle = '#16213e';
        ctx.lineWidth = 3;
        ctx.stroke();
    } else {
        ctx.strokeStyle = '#16213e';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
    
    drawPaths();
    updateParticles();
    drawParticles();
    drawControlPoints(); // Draw control points last so they're on top
    
    if (isPlaying) {
        animationId = requestAnimationFrame(animate);
    }
}

playPauseBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
        playPauseBtn.textContent = 'Pause';
        animate();
    } else {
        playPauseBtn.textContent = 'Play';
        cancelAnimationFrame(animationId);
    }
});

resetBtn.addEventListener('click', () => {
    initParticle();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawParticles();
});

speedSlider.addEventListener('input', (e) => {
    const newSpeed = parseFloat(e.target.value);
    speedValue.textContent = newSpeed;
    speed = newSpeed;
    
    // Update all particles' velocities
    particles.forEach(particle => {
        const currentSpeed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        if (currentSpeed > 0) {
            // Normalize and apply new speed
            particle.vx = (particle.vx / currentSpeed) * newSpeed;
            particle.vy = (particle.vy / currentSpeed) * newSpeed;
        }
    });
});

particleCountInput.addEventListener('change', () => {
    initParticle();
});

shapeSelect.addEventListener('change', (e) => {
    currentShape = e.target.value;
    canvas.style.cursor = 'default'; // Reset cursor
    
    // Show/hide controls based on shape
    if (currentShape === 'ellipse') {
        ellipseControls.style.display = 'flex';
        irregularControls.style.display = 'none';
    } else if (currentShape === 'irregular') {
        ellipseControls.style.display = 'none';
        irregularControls.style.display = 'flex';
        const result = generateIrregularEllipse(280, 180, irregularAmplitude, irregularControlPointsCount);
        irregularBoundary = result.boundary;
        irregularControlPoints = result.controlPoints;
    } else {
        ellipseControls.style.display = 'none';
        irregularControls.style.display = 'none';
    }
    
    initParticle();
    if (!isPlaying) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (currentShape === 'circle') {
            ctx.beginPath();
            ctx.arc(circleCenter.x, circleCenter.y, circleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#16213e';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (currentShape === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(ellipseCenter.x, ellipseCenter.y, ellipseRadiusX, ellipseRadiusY, 0, 0, Math.PI * 2);
            ctx.strokeStyle = '#16213e';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (currentShape === 'irregular') {
            ctx.beginPath();
            ctx.moveTo(irregularBoundary.x[0], irregularBoundary.y[0]);
            for (let i = 1; i < irregularBoundary.x.length; i++) {
                ctx.lineTo(irregularBoundary.x[i], irregularBoundary.y[i]);
            }
            ctx.closePath();
            ctx.strokeStyle = '#16213e';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else {
            ctx.strokeStyle = '#16213e';
            ctx.lineWidth = 3;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
        }
        drawParticles();
    }
});

ellipseWidthSlider.addEventListener('input', (e) => {
    ellipseRadiusX = parseInt(e.target.value);
    widthValue.textContent = ellipseRadiusX;
    if (currentShape === 'ellipse') {
        initParticle();
    }
});

ellipseHeightSlider.addEventListener('input', (e) => {
    ellipseRadiusY = parseInt(e.target.value);
    heightValue.textContent = ellipseRadiusY;
    if (currentShape === 'ellipse') {
        initParticle();
    }
});

irregularAmplitudeSlider.addEventListener('input', (e) => {
    irregularAmplitude = parseFloat(e.target.value);
    amplitudeValue.textContent = irregularAmplitude.toFixed(2);
    if (currentShape === 'irregular') {
        const result = generateIrregularEllipse(280, 180, irregularAmplitude, irregularControlPointsCount);
        irregularBoundary = result.boundary;
        irregularControlPoints = result.controlPoints;
        initParticle();
    }
});

regenerateIrregularBtn.addEventListener('click', () => {
    irregularSeed = Math.floor(Math.random() * 10000);
    const result = generateIrregularEllipse(280, 180, irregularAmplitude, irregularControlPointsCount);
    irregularBoundary = result.boundary;
    irregularControlPoints = result.controlPoints;
    initParticle();
});

controlPointsCountInput.addEventListener('change', (e) => {
    irregularControlPointsCount = parseInt(e.target.value) || 12;
    if (currentShape === 'irregular') {
        const result = generateIrregularEllipse(280, 180, irregularAmplitude, irregularControlPointsCount);
        irregularBoundary = result.boundary;
        irregularControlPoints = result.controlPoints;
        initParticle();
    }
});

// Mouse event handlers for dragging control points
canvas.addEventListener('mousedown', (e) => {
    if (currentShape !== 'irregular') return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Find if we clicked near a control point
    for (let i = 0; i < irregularControlPoints.length; i++) {
        const point = irregularControlPoints[i];
        const dist = Math.sqrt((mouseX - point.x) ** 2 + (mouseY - point.y) ** 2);
        
        if (dist < 15) { // Within 15 pixels
            draggedPointIndex = i;
            isMouseDown = true;
            canvas.style.cursor = 'grabbing';
            break;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (currentShape === 'irregular') {
        // Update cursor based on proximity to control points
        if (!isMouseDown) {
            let nearPoint = false;
            for (let i = 0; i < irregularControlPoints.length; i++) {
                const point = irregularControlPoints[i];
                const dist = Math.sqrt((mouseX - point.x) ** 2 + (mouseY - point.y) ** 2);
                
                if (dist < 15) {
                    nearPoint = true;
                    break;
                }
            }
            canvas.style.cursor = nearPoint ? 'grab' : 'default';
        }
        
        // Drag the control point
        if (isMouseDown && draggedPointIndex >= 0) {
            irregularControlPoints[draggedPointIndex].x = mouseX;
            irregularControlPoints[draggedPointIndex].y = mouseY;
            
            // Regenerate boundary with new control points
            irregularBoundary = interpolateBoundary(irregularControlPoints);
            
            // Redraw if paused
            if (!isPlaying) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.beginPath();
                ctx.moveTo(irregularBoundary.x[0], irregularBoundary.y[0]);
                for (let i = 1; i < irregularBoundary.x.length; i++) {
                    ctx.lineTo(irregularBoundary.x[i], irregularBoundary.y[i]);
                }
                ctx.closePath();
                ctx.strokeStyle = '#16213e';
                ctx.lineWidth = 3;
                ctx.stroke();
                drawPaths();
                drawParticles();
                drawControlPoints();
            }
        }
    }
});

canvas.addEventListener('mouseup', () => {
    isMouseDown = false;
    draggedPointIndex = -1;
    if (currentShape === 'irregular') {
        canvas.style.cursor = 'grab';
    }
});

canvas.addEventListener('mouseleave', () => {
    isMouseDown = false;
    draggedPointIndex = -1;
    canvas.style.cursor = 'default';
});

// Initialize and start
initParticle();
animate();