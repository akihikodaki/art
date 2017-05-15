/*
	Copyright (C) 2017  Kagucho <kagucho.net@gmail.com>

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published
	by the Free Software Foundation, either version 3 of the License, or (at
	your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

(() => {
	const canvas = document.body.children[0];
	const div = document.body.children[1];
	const hueInterval = 2;
	const sqrt3 = Math.sqrt(3);
	const interval = 1000;
	let draw;
	let entries = [];

	function initDraw() {
		const context = canvas.getContext("2d");
		const line = Math.min(window.innerHeight, window.innerWidth) / 2;
		const scale = line / interval;
		const x = window.innerWidth / 2;
		const y = window.innerHeight / 2;

		function newAureoleLineGradient(context, hue) {
			const x = window.innerWidth / 2;
			const y = window.innerHeight / 2;
			const gradient = context.createRadialGradient(
				x, y, line, x, y, 0);

			gradient.addColorStop(0, `hsla(${hue + 180}, 100%, 50%, 0)`);
			gradient.addColorStop(0.8, `hsl(${hue + 180}, 100%, 50%)`);
			gradient.addColorStop(0.9, `hsla(${hue + 180}, 100%, 50%, 0)`);

			return gradient;
		}

		function initialize() {
			canvas.style = "position: fixed; left: 0; top: 0";
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			context.lineWidth = line / 64;
		}

		initialize();

		draw = date => {
			context.clearRect(0, 0, canvas.width, canvas.height);

			for (const entry of entries) {
				const scaled = (date - entry.date) % interval * scale;
				const sin = Math.sin(entry.rad);
				const cos = Math.cos(entry.rad);

				context.strokeStyle = newAureoleLineGradient(context, entry.hue);

				context.moveTo(x, y);

				context.lineTo(
					x + cos * scaled, y + sin * scaled);

				context.stroke();
				context.beginPath(); // resetting; see the bottom comment
			}
		};
	}

	function ssort() {
		entries.sort((e, f) => e.date % interval - f.date % interval);

		const f = i => {
			let min = i;
			let minValue = entries[i].rad;

			const g = j => {
				if (j < entries.length) {
					entries[j].hue += hueInterval;
					this.notify(() => {
						const value = entries[j].rad;
						if (value < minValue) {
							min = j;
							minValue = value;
						}

						g(j + 1);
					});
				} else {
					entries[i].hue += hueInterval;
					this.notify(() => {
						entries[min].hue += hueInterval;
						this.notify(() => {
							entries[min].rad = entries[i].rad;

							entries[i].hue += hueInterval;
							this.notify(() => {
								entries[i].rad = minValue;

								i++;
								if (i < entries.length)
									this.notify(f.bind(null, i));
								else
									this.end();
							});
						});
					});
				}
			};

			g(i);
		};

		f(0);
	}

	function hsort() {
		const heapify = (parent, length, callback) => {
			entries[parent].hue += hueInterval;
			this.notify(() => {
				const parentValue = entries[parent].rad;
				const early = parent * 2 + 1;
				const next = parent * 2 + 2;
				let max = parent;
				let maxValue = parentValue;

				const swap = () => {
					if (parent == max) {
						callback();
					} else {
						entries[parent].hue += hueInterval;
						this.notify(() => {
							entries[parent].rad = maxValue;

							entries[max].hue += hueInterval;
							this.notify(() => {
								entries[max].rad = parentValue;
								heapify(max, length, callback);
							});
						});
					}
				};

				if (early < length) {
					entries[early].hue++;
					this.notify(() => {
						const value = entries[early].rad;
						if (value > maxValue) {
							max = early;
							maxValue = value;
						}

						if (next < length) {
							entries[next].hue += hueInterval;
							this.notify(() => {
								const value = entries[next].rad;
								if (value > maxValue) {
									max = next;
									maxValue = value;
								}

								swap();
							});
						} else {
							swap();
						}
					});
				} else {
					callback();
				}
			});
		}

		const extractRecursively = index => {
			if (index > 0) {
				entries[0].hue += hueInterval;
				this.notify(() => {
					const max = entries[0].rad;

					entries[0].hue += hueInterval;
					this.notify(() => {
						entries[index].hue += hueInterval;
						this.notify(() => {
							entries[0].rad = entries[index].rad;

							entries[index].hue += hueInterval;
							this.notify(() => {
								entries[index].rad = max;
								this.notify(heapify.bind(null, 0, index - 1,
									extractRecursively.bind(null, index - 1)));
							});
						});
					});
				});
			} else {
				this.end();
			}
		};

		(function heapifyRecursively(index) {
			if (index < 0)
				extractRecursively(entries.length - 1);
			else
				heapify(index, entries.length,
					heapifyRecursively.bind(null, index - 1));
		})(Math.floor(entries.length / 2));
	}

	let endCanvasReflection;
	function startCanvasReflection() {
		const listening = canvas.addEventListener("click", event => {
			const x = event.clientX - canvas.width / 2;
			const y = event.clientY - canvas.height / 2;
			const distance = Math.sqrt(x * x + y * y);
			entries.push({
				hue:  0,
				rad:  Math.acos(x / distance) * Math.sign(y),
				date: Date.now(),
			});
		});

		let request = requestAnimationFrame(function recurse() {
			draw(Date.now());
			request = requestAnimationFrame(recurse);
		});

		endCanvasReflection = () => {
			cancelAnimationFrame(request);
			canvas.removeEventListener("click", listening);
		};
	};

	const reflectSeedClicks =
		element => element.addEventListener("click",
			() => setTimeout(() => {
				entries = Array(128);
				for (let index = 0; index < entries.length; index++) {
					entries[index] = {
						hue: 0,
						rad: Math.random() * 2 * Math.PI,
						date: Math.random() * interval,
					};
				}
			}, interval - Date.now() % interval));

	const reflector = sort => () => {
		let count = 0;

		endCanvasReflection();
		entries.sort((e, f) => e.date % interval - f.date % interval);

		sort.call({
			notify(callback) {
				count++;
				if (count % 16) {
					callback();
				} else {
					draw(Date.now());
					setTimeout(callback, 16);
				}
			},

			end() {
				startCanvasReflection();
				document.getElementById("count").textContent = count;
			},
		});
	};

	const reflectSsortClicks =
		element => element.addEventListener("click",
			() => setTimeout(reflector(ssort), interval - Date.now() % interval));

	const reflectHsortClicks =
		element => element.addEventListener("click",
			() => setTimeout(reflector(hsort), interval - Date.now() % interval));

	initDraw();
	startCanvasReflection();
	reflectSeedClicks(div.children[0]);
	reflectHsortClicks(div.children[1]);
	reflectSsortClicks(div.children[2]);
})();
