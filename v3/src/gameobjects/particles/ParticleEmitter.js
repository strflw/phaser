var Between = require('../../math/Between');
var Class = require('../../utils/Class');
var Components = require('../components');
var DegToRad = require('../../math/DegToRad');
var Easing = require('../../math/easing');
var GameObject = require('../GameObject');
var GetEaseFunction = require('../../tweens/builder/GetEaseFunction');
var MinMax2 = require('../../math/MinMax2');
var MinMax4 = require('../../math/MinMax4');
var Particle = require('./Particle');
var StableSort = require('../../utils/array/StableSort');

var ParticleEmitter = new Class({

    Mixins: [
        Components.BlendMode,
        Components.RenderTarget,
        Components.ScrollFactor,
        Components.Visible
    ],

    initialize:

    function ParticleEmitter (manager, config)
    {
        if (config === undefined) { config = {}; }

        this.manager = manager;

        this.key = '';

        this.frame = manager.frame;

        this.particleClass = Particle;

        this.dead = [];
        this.alive = [];

        this.x = 0;
        this.y = 0;

        //  Implement ease into the MinMax component?

        this.velocity = new MinMax4();

        this.scale = new MinMax4(1);

        this.gravity = new MinMax4();

        this.alpha = new MinMax2(1);

        this.angle = new MinMax2(0, 360);

        this.particleAngle = new MinMax2();

        //  The lifespan of the particles (in ms)
        this.lifespan = new MinMax2(1000);

        this.deathCallback = null;
        this.deathCallbackScope = null;

        this.emitCount = 1;

        /**
        * @property {number} frequency - How often a particle is emitted in ms (if emitter is started with Explode === false).
        */
        this.frequency = 100;

        /**
        * @property {boolean} on - Determines whether the emitter is currently emitting particles. It is totally safe to directly toggle this.
        * @default
        */
        this.on = false;
        // this.enabled = true;

        /**
        * @property {boolean} particleBringToTop - If this is `true` then when the Particle is emitted it will be bought to the top of the Emitters display list.
        * @default
        */
        this.particleBringToTop = false;

        /**
        * @property {boolean} particleSendToBack - If this is `true` then when the Particle is emitted it will be sent to the back of the Emitters display list.
        * @default
        */
        this.particleSendToBack = false;

        this.timeScale = 1;

        // this.delay = 0;
        // this.delayCounter = 0;
        // this.allowCreation = true;

        this.emitShape = null;

        this.easingFunctionAlpha = Easing.Linear;
        this.easingFunctionScale = Easing.Linear;
        this.easingFunctionRotation = Easing.Linear;

        this.active = true;
    },

    setFrame: function (frame)
    {
        this.frame = this.manager.texture.get(frame);

        return this;
    },

    setPosition: function (x, y)
    {
        this.x = x;
        this.y = y;

        return this;
    },

    /*
    setEase: function (easeName, easeParam)
    {
        var ease = GetEaseFunction(easeName, easeParam);

        this.easingFunctionAlpha = ease;
        this.easingFunctionScale = ease;
        this.easingFunctionRotation = ease;

        return this;
    },

    setAlphaEase: function (easeName, easeParam)
    {
        this.easingFunctionAlpha = GetEaseFunction(easeName, easeParam);

        return this;
    },

    setScaleEase: function (easeName, easeParam)
    {
        this.easingFunctionScale = GetEaseFunction(easeName, easeParam);

        return this;
    },

    setRotationEase: function (easeName, easeParam)
    {
        this.easingFunctionRotation = GetEaseFunction(easeName, easeParam);

        return this;
    },
    */

    //  Particle Emission

    setVelocity: function (xMin, xMax, yMin, yMax)
    {
        this.velocity.set(xMin, xMax, yMin, yMax);

        return this;
    },

    setScale: function (xMin, xMax, yMin, yMax)
    {
        this.scale.set(xMin, xMax, yMin, yMax);

        return this;
    },

    setGravity: function (xMin, xMax, yMin, yMax)
    {
        this.gravity.set(xMin, xMax, yMin, yMax);

        return this;
    },

    setAlpha: function (min, max)
    {
        this.alpha.set(min, max);

        return this;
    },

    setAngle: function (min, max)
    {
        this.angle.set(min, max);

        return this;
    },

    setParticleAngle: function (min, max)
    {
        this.particleAngle.set(min, max);

        return this;
    },

    setLifespan: function (min, max)
    {
        this.lifespan.set(min, max);

        return this;
    },

    setDelay: function (delay)
    {
        this.delay = delay;
        this.delayCounter = delay / 1000;

        return this;
    },

    setShape: function (shape)
    {
        this.emitShape = shape;

        return this;
    },

    //  Particle Management

    reserve: function (particleCount)
    {
        var dead = this.dead;

        for (var count = 0; count < particleCount; ++count)
        {
            dead.push(new this.particleClass(this.x, this.y, this.frame));
        }

        return this;
    },

    getAliveParticleCount: function ()
    {
        return this.alive.length;
    },

    getDeadParticleCount: function ()
    {
        return this.dead.length;
    },

    getParticleCount: function ()
    {
        return this.getAliveParticleCount() + this.getDeadParticleCount();
    },

    onParticleDeath: function (callback, context)
    {
        if (callback === undefined)
        {
            //  Clear any previously set callback
            this.deathCallback = null;
            this.deathCallbackScope = null;
        }
        else if (typeof callback === 'function')
        {
            this.deathCallback = callback;

            if (context)
            {
                this.deathCallbackScope = context;
            }
        }

        return this;
    },

    killAll: function ()
    {
        var dead = this.dead;
        var alive = this.alive;

        while (alive.length > 0)
        {
            dead.push(alive.pop());
        }

        return this;
    },

    forEachAlive: function (callback, thisArg)
    {
        var alive = this.alive;
        var length = alive.length;

        for (var index = 0; index < length; ++index)
        {
            callback.call(thisArg, alive[index]);
        }

        return this;
    },

    forEachDead: function (callback, thisArg)
    {
        var dead = this.dead;
        var length = dead.length;

        for (var index = 0; index < length; ++index)
        {
            callback.call(thisArg, dead[index]);
        }

        return this;
    },

    pause: function ()
    {
        this.active = false;

        return this;
    },

    resume: function ()
    {
        this.active = true;

        return this;
    },









    explode: function (count)
    {
        this.emit(count);

        return this;
    },

    emitAt: function (x, y, count)
    {
        var oldX = this.x;
        var oldY = this.y;

        this.x = x;
        this.y = y;

        var particle = this.emit(count);

        this.x = oldX;
        this.y = oldY;

        return particle;
    },

    emit: function (count)
    {
        if (count === undefined) { count = 1; }

        var particle = null;

        var x = this.x;
        var y = this.y;
        // var shape = this.emitShape;
        var dead = this.dead;
        // var allowCreation = this.allowCreation;

        for (var index = 0; index < count; index++)
        {
            if (dead.length > 0)
            {
                particle = dead.pop();
                particle.reset(x, y, this.frame);
            }
            else if (allowCreation)
            {
                particle = new this.particleClass(x, y, this.frame);
            }
            else
            {
                return null;
            }

            // if (shape)
            // {
            //     shape.getRandomPoint(particle);
            //     particle.x += x;
            //     particle.y += y;
            // }

            particle.emit(this);

            // particle.velocityX = vx;
            // particle.velocityY = vy;
            // particle.life = Math.max(this.life, Number.MIN_VALUE);
            // particle.lifeStep = particle.life;
            // particle.start.scale = this.startScale;
            // particle.end.scale = this.endScale;
            // particle.scaleX = this.startScale;
            // particle.scaleY = this.startScale;
            // particle.start.alpha = this.startAlpha;
            // particle.end.alpha = this.endAlpha;
            // particle.start.rotation = DegToRad(this.startAngle);
            // particle.end.rotation = DegToRad(this.endAngle);
            // particle.color = (particle.color & 0x00FFFFFF) | (((this.startAlpha * 0xFF)|0) << 24);
            // particle.index = this.alive.length;

            this.alive.push(particle);
        }

        return particle;
    },

    preUpdate: function (time, delta)
    {
        //  Scale the delta
        delta *= this.timeScale;

        var dead = this.dead;
        var particles = this.alive;

        var length = particles.length;

        var step = (delta / 1000);

        var deathCallback = this.deathCallback;
        var deathCallbackScope = this.deathCallbackScope;

        /* Simulation */
        for (var index = 0; index < length; index++)
        {
            var particle = particles[index];

            //  update returns `true` if the particle is now dead (lifeStep < 0)
            if (particle.update(this, step))
            {
                //  Moves the dead particle to the end of the particles array (ready for splicing out later)
                var last = particles[length - 1];
                particles[length - 1] = particle;
                particles[index] = last;
                index -= 1;
                length -= 1;
            }

            /*
            particle.velocityX += gravityX;
            particle.velocityY += gravityY;
            particle.x += particle.velocityX * emitterStep;
            particle.y += particle.velocityY * emitterStep;
            particle.normLifeStep = particle.lifeStep / particle.life;

            var norm = 1 - particle.normLifeStep;
            var alphaEase = this.easingFunctionAlpha(norm);
            var scaleEase = this.easingFunctionScale(norm);
            var rotationEase = this.easingFunctionRotation(norm);
            var alphaf = (particle.end.alpha - particle.start.alpha) * alphaEase + particle.start.alpha;
            var scale = (particle.end.scale - particle.start.scale) * scaleEase + particle.start.scale;
            var rotation = (particle.end.rotation - particle.start.rotation) * rotationEase + particle.start.rotation;

            particle.scaleX = particle.scaleY = scale;
            particle.color = (particle.color & 0x00FFFFFF) | (((alphaf * 0xFF)|0) << 24);
            particle.rotation = rotation;

            if (particle.lifeStep <= 0)
            {
                var last = particles[length - 1];
                particles[length - 1] = particle;
                particles[index] = last;
                index -= 1;
                length -= 1;

                if (deathCallback)
                {
                    deathCallback.call(deathCallbackScope, particle);
                }
            }

            particle.lifeStep -= emitterStep;
            */
        }

        //  Move dead particles to the dead array
        //  We can skip this for 'emitCount' number of particles if 'this.enabled'
        var deadLength = particles.length - length;

        if (deadLength > 0)
        {
            dead.push.apply(dead, particles.splice(particles.length - deadLength, deadLength));

            StableSort(particles, this.indexSort);
        }

        this.delayCounter -= emitterStep;

        if (this.delayCounter <= 0 && this.enabled)
        {
            this.emit(this.emitCount);
            this.delayCounter = this.delay / 1000;
        }
    },

    indexSort: function (a, b)
    {
        return a.index - b.index;
    }

});

module.exports = ParticleEmitter;
