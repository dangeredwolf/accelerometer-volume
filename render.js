var canvas = document.getElementById('c'),
    ctx = canvas.getContext('2d'),
    w, h, hw, hh,
    vw = x => {
        return x * (w * 0.01);
    },
    vh = y => {
        return y * (h * 0.01);
    },
    sq = n => {
        return n * n;
    },
    lineIntersects = (v1, v2) => {
        var gamma, lambda,
            a = 20,
            b = 70,
            c = 80,
            d = 70,
            p = v1.x,
            q = v1.y,
            r = v2.x,
            s = v2.y,
            det = (c - a) * (s - q) - (r - p) * (d - b);

        if (det === 0) {
            return false;
        } else {
            lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
            gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
            return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
        }
    },
    circleIntersects = c => {
        var dx = c.pos.x - 20
        dy = c.pos.y - 70,
            int = new vec(60, 0),
            dxx = int.x,
            dyy = int.y,
            t = (dx * dxx + dy * dyy) / (dxx * dxx + dyy * dyy),
            x = 20 + dxx * t,
            y = 70 + dyy * t;

        if (t < 0) {
            x = 20;
            y = 70;
        }
        if (t > 1) {
            x = 80;
            y = 70;
        }

        var cdx = c.pos.x - x,
            cdy = c.pos.y - y;

        return (cdx * cdx + cdy * cdy < sq(c.radius))
    },
    map = (n, min1, max1, max2) => {
        return ((n - min1) / (max1 - min1)) * max2;
    },
    touchToMouse = e => {
        return e.touches[e.touches.length - 1]
    },
    audioCtx = null,
    oscillator = null,
    gain = null,
    startAudio = () => {
        audioCtx = new AudioContext();

        // Create Gain (Volume Control) and connect to Speakers
        gain = audioCtx.createGain();
        gain.connect(audioCtx.destination);

        // Create an OscillatorNode (Frequency Control) and connect to Gain
        oscillator = audioCtx.createOscillator();
        oscillator.connect(gain);

        oscillator.type = "sine";
        controlSound(440, 1)
        oscillator.start();
        return oscillator;
    }
    controlSound = (f, a) => {
        if (audioCtx == null || (f === lastFreq && a === lastAmpl))
            return;
        lastFreq = f;
        lastAmpl = a;
        oscillator.frequency.setValueAtTime(f, audioCtx.currentTime);
        gain.gain.value = a;
    };

let audioStopped = true,
    lastFreq = 0,
    lastAmpl = 0;
window.toggleAudio = (e) => {
    audioStopped = !audioStopped;
    if (audioStopped)
        gain.gain.value = 0;
    else
        if (oscillator === null)
            startAudio();
        else
            lastFreq = 0;

    if (audioStopped)
        e.innerHTML = "Resume Audio Playback";
    else
        e.innerHTML = "Stop Audio Playback"
}

(r = () => {
    canvas.width = 300;
    canvas.height = 300;
    w = canvas.width;
    h = canvas.height;
    hw = ~~(w / 2);
    hh = ~~(h / 2);
})();

class vec {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;

        this.add = (v, dontMutate) => {
            if (dontMutate) {
                return new vec(this.x + v.x, this.y + v.y)
            } else {
                this.x += v.x;
                this.y += v.y;
                return this;
            }
        }

        this.copy = () => {
            return new vec(this.x, this.y);
        }
    }
}

class Ball {
    constructor() {
        this.acc = new vec(0, 0.05);
        this.vel = new vec();
        this.pos = new vec(50, 70);
        this.restitution = -0.7;
        this.radius = 2.5;
        this.onLine = true;
        this.immune = true;

        this.pointIntersects = (x, y) => {
            return sq(x - vw(this.pos.x)) + sq(y - vh(this.pos.y)) < sq(vw(this.radius))
        }

        this.update = () => {
            this.last = this.pos.copy();
            if (!this.onLine && !selector.hasSelected) {

                this.vel.add(this.acc);
                this.pos.add(this.vel);

                if (this.pos.y > 100 - this.radius) {
                    this.vel.y *= this.restitution;
                    this.vel.x *= this.restitution * -1;
                    this.pos.y = 100 - this.radius;
                }
                if (this.pos.x > 100 - this.radius) {
                    this.vel.x *= this.restitution;
                    this.pos.x = 100 - this.radius;
                }
                if (this.pos.x < this.radius) {
                    this.vel.x *= this.restitution;
                    this.pos.x = this.radius;
                }

                if (!this.immune && (lineIntersects(this.last, this.pos) || circleIntersects(this))) {
                    this.onLine = true;
                    this.pos = new vec(this.pos.x, 70);
                    this.immune = true;
                }
            }
        }

        this.render = () => {
            ctx.beginPath();
            ctx.arc(vw(this.pos.x), vh(this.pos.y), vw(this.radius), 0, Math.PI * 2);
            ctx.closePath();

            ctx.fillStyle = '#000';
            ctx.fill();
        }
    }
}

class Selector {
    constructor() {
        this.hasSelected = false;
        this.lastPos = new vec();
        this.vel = new vec();

        this.move = (e) => {
            let x = e.clientX - canvas.offsetLeft,
                y = e.clientY - canvas.offsetTop;

            if (this.hasSelected) {
                canvas.style.cursor = 'grabbing';
                if (ball.onLine) {
                    ball.pos.x = (x / w) * 100;

                    if (ball.pos.x > 80 || ball.pos.x < 20) {
                        ball.onLine = false;
                        ball.vel.x = this.vel.x;
                        this.unselect();
                        setTimeout(() => {
                            ball.immune = false;
                        }, 100)
                    }
                } else {
                    ball.pos.x = (x / w) * 100;
                    ball.pos.y = (y / h) * 100;

                    if (!ball.immune && (lineIntersects(ball.last, ball.pos) || circleIntersects(ball))) {
                        this.unselect();
                        ball.onLine = true;
						ball.vel = {x: 0, y: 0}
                        ball.pos = new vec(ball.pos.x, 70);
                    }
                }
            } else {
                if (ball.pointIntersects(x, y)) {
                    canvas.style.cursor = 'grab';
                } else {
                    canvas.style.cursor = 'auto';
                }
            }
            this.vel = new vec(x - this.lastPos.x, y - this.lastPos.y);
            this.lastPos = new vec(x, y);
        }

        this.unselect = () => {
            if (this.hasSelected)
                ball.vel = this.vel.copy();
            this.hasSelected = false;
            canvas.style.cursor = 'auto';
        }

        this.select = (e) => {
            this.unselect();
            let x = e.clientX - canvas.offsetLeft,
                y = e.clientY - canvas.offsetTop;

            if (ball.pointIntersects(x, y)) {
                this.hasSelected = true;
            }
        }

        window.addEventListener('mousemove', this.move);
        window.addEventListener('mousedown', this.select);
        window.addEventListener('mouseup', this.unselect);

        window.addEventListener('touchmove', (e) => {
            this.move(touchToMouse(e));
        });
        window.addEventListener('touchstart', (e) => {
            this.select(touchToMouse(e));
        });
        window.addEventListener('touchend', (e) => {
            this.unselect(touchToMouse(e));
        })
    }
}

const ball = new Ball(),
    selector = new Selector();

if (typeof Accelerometer !== "undefined") {

	document.getElementById("support").innerHTML = "Your browser <b class=\"green\">SUPPORTS</b> the accelerometer API.";
	let acc = new Accelerometer({frequency: 60});

	acc.addEventListener("reading", () => {
	    console.log("X Acceleration " + acc.x);
	    console.log("Y Acceleration " + acc.y);

		if (ball.onLine) {
			ball.pos.x -= (acc.x / 3);
			if (ball.pos.x > 80) {
				ball.pos.x = 80;
				ball.onLine = false;
				selector.unselect();
				setTimeout(() => {
					ball.immune = false;
				}, 100)
			} else if (ball.pos.x < 20) {
				ball.pos.x = 20;
				ball.onLine = false;
				selector.unselect();
				setTimeout(() => {
					ball.immune = false;
				}, 100)
			}
		} else {
			ball.vel.x -= (acc.x / 3);
			let velocityY = (acc.y / 3);
			if (acc.y < 0) {
				ball.vel.y += (acc.y / 15);
				if (ball.vel.y < -3) {
					ball.vel.y = -3;
				}
			}
		}
	});

	acc.start();
} else {
	document.getElementById("support").innerHTML = "Your browser <b class=\"red\">DOES NOT SUPPORT</b> the accelerometer API. Boooo :(";
}

const maxVolume = 0.7;
const minFreq = 300;
const maxFreq = 480;
(f = i => {
    requestAnimationFrame(f);
    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.moveTo(vw(20), vh(70));
    ctx.lineTo(vw(80), vh(70));
    ctx.closePath();

    ctx.strokeStyle = '#555555';
    ctx.stroke();

    ball.update();
    ball.render();

    let volume = ~~map(ball.pos.x, 20, 80, 100);
    let pitch = ~~(100 - ball.pos.y - 30);

    if (!audioStopped)
        controlSound((pitch/100)*(maxFreq-minFreq)+minFreq, maxVolume*volume/100)

    ctx.font = '20px Arial';
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(volume + (~~(100 - ball.pos.y - 30) ? ' + ' + pitch + 'i ' : '') + '% ', hh, hw);
})(0);
