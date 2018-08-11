class GameObject {
    constructor() {
        this.location = [0, 0];
    }
    /**
     *
     * @param {Camera} context
     */
    draw(context) {

    }

    key_event(type, key) {

    }
}

class Dot extends GameObject {
    constructor(location) {
        super();
        this.location = location;
        this.size = Math.round(Math.random() * 20);
    }
    draw(camera) {
        var context = camera.canvas;
        context.save();
        context.fillStyle = "blue";
        var drawLoc = camera.world_to_screen(this.location[0] + (this.size / 2), this.location[1] + (this.size / 2));
        context.fillRect(drawLoc[0], drawLoc[1], this.size, this.size);
        context.restore();
    }
}

class Player extends GameObject {
    constructor() {
        super();
        this._anim_tracker = 0;
        this._anim_max = 120; //2 second max animation
        this._velocity = [0, 0];
        this.location = [40, 40];
    }

    key_event(type, key) {
        switch(key) {
            case "a":
                if(type) {
                    this._velocity[0] -= 1;
                } else {
                    this._velocity[0] += 1;
                }
                break;
            case "d":
                if(type) {
                    this._velocity[0] += 1;
                } else {
                    this._velocity[0] -= 1;
                }
                break;
            case "s":
                if(type) {
                    this._velocity[1] += 1;
                } else {
                    this._velocity[1] -= 1;
                }
                break;
            case "w":
                if(type) {
                    this._velocity[1] -= 1;
                } else {
                    this._velocity[1] += 1;
                }
                break;
            case "j":
                gameManager._test_spam();
        }
    }

    draw(camera) {
        this._track_animation();
        this._do_physics();
        var context = camera.canvas;
        context.save();
        context.fillStyle = "orange";
        var squareSize = 50;
        var bulge = 10;
        var currentBulge = Math.abs((this._anim_tracker / this._anim_max) - 0.5) * bulge;
        var totalWidth = squareSize + currentBulge;
        var drawLocation = camera.world_to_screen(this.location[0] - (totalWidth / 2), this.location[1] - (totalWidth / 2));
        context.fillRect(drawLocation[0], drawLocation[1], totalWidth, totalWidth);
        context.restore();
    }

    _do_physics() {
        if(gameManager.in_map_bounds(this.location[0] + this._velocity[0], this.location[1] + this._velocity[1])) {
            this.location[0] += this._velocity[0];
            this.location[1] += this._velocity[1];
        }
    }

    _track_animation() {
        this._anim_tracker++;
        if(this._anim_tracker > this._anim_max) {
            this._anim_tracker = 0;
        }
    }
}

class Camera {
    constructor(width, height, starting_location, canvas) {
        this.width = width;
        this.height = height;
        this.location = starting_location;
        this.canvas = canvas;
        this._screen_center = [this.width / 2, this.height / 2];
        this._following = null;
    }

    set_follow(gameObject) {
        this._following = gameObject;
    }

    world_to_screen(obj_x, obj_y) {
        var dist_to_x = this.location[0] - obj_x;
        var dist_to_y = this.location[1] - obj_y;
        return [this._screen_center[0] - dist_to_x, this._screen_center[1] - dist_to_y];
    }

    in_camera_view(obj_x, obj_y) {
        var dist_to_x = this.location[0] - obj_x;
        var dist_to_y = this.location[1] - obj_y;
        return this._screen_center[0] > Math.abs(dist_to_x) && this._screen_center[1] > Math.abs(dist_to_y);
    }

    tick() {
        if(this._following)
            this.location = this._following.location;
    }
}

class GameManager {
    constructor(canvas, target_fps) {
        this._frame_counter = 0;
        this._map_bounds = [1000, 1000];
        this._buffer = document.createElement("canvas");
        this._buffer_canvas = this._buffer.getContext("2d");
        this._buffer.width = canvas.canvas.width;
        this._buffer.height = canvas.canvas.height;
        this._camera = new Camera(canvas.canvas.width, canvas.canvas.height, [0, 0], this._buffer_canvas);
        this._target_fps = target_fps;
        this._canvas = canvas;
        this._game_objects = [];
        this._running_game = setInterval(this._loop.bind(this), 1000 / this._target_fps);
        this._test_counter = setInterval(this._count_frames.bind(this), 1000);
        this._key_subscribers = [];
        this._keys_down = [];
        this._keys_enabled = true;
        this._setup_listeners();
        this._setup_player();
    }

    _count_frames() {
        console.log("%cFPS: " + this._frame_counter, "color: red; font-size: medium");
        console.log("%cObjects: " + this._game_objects.length, "color: red; font-size: medium");
        this._frame_counter = 0;
    }

    _setup_player() {
        var pl = new Player();
        this.add_game_object(pl, true);
        this._camera.set_follow(pl);
        this.add_game_object(new Dot([100, 100]));
        this.add_game_object(new Dot([89, 124]));
    }

    in_map_bounds(x, y) {
        return x > -1 && y > -1 && x <= this._map_bounds[0] && y <= this._map_bounds[1];
    }

    _setup_listeners() {
        window.onkeydown = function (oEvt) {
            if (this._keys_enabled && this._keys_down.indexOf(oEvt.key) === -1) {
                this._keys_down.push(oEvt.key);
                for (var o of this._key_subscribers) {
                    o.key_event(true, oEvt.key);
                }
            }
        }.bind(this);

        window.onkeyup = function (oEvt) {
            if(this._keys_down.indexOf(oEvt.key) !== -1) {
                for (var o of this._key_subscribers) {
                    o.key_event(false, oEvt.key);
                }
                this._keys_down.splice(this._keys_down.indexOf(oEvt.key), 1);
            } else {
                console.log("unmatched key: " + oEvt.key);
            }
        }.bind(this);
    }

    add_key_subscriber(gameObject) {
        this._key_subscribers.push(gameObject);
    }

    _loop() {
        this._draw_all();
        this._copy_buffer_to_canvas();
        this._camera.tick();
        this._frame_counter++;
    }

    _copy_buffer_to_canvas() {
        this._canvas.clearRect(0, 0, this._canvas.canvas.width, this._canvas.canvas.height);
        this._canvas.drawImage(this._buffer, 0, 0);
        this._buffer_canvas.clearRect(0, 0, this._buffer.width, this._buffer.height);
    }

    add_game_object(game_object, key_sub) {
        //TODO: validation
        this._game_objects.push(game_object);
        if(key_sub) {
            this.add_key_subscriber(game_object);
        }
    }

    _test_spam() {
        console.log("spamming game objects, please wait :)");
        for(var i = 0; i < 100; i++) {
            this.add_game_object(new Dot([Math.random() * 1000, Math.random() * 1000]))
        }
    }


    _draw_all() {
        for(var obj of this._game_objects) {
            if(this._camera.in_camera_view(obj.location[0], obj.location[1])) {
                obj.draw(this._camera);
            }
        }
    }
}

var gameCanvas = document.getElementById("gameCanvas").getContext("2d");
gameCanvas.canvas.width = window.innerWidth;
gameCanvas.canvas.height = window.innerHeight;
var gameManager = new GameManager(gameCanvas, 60);