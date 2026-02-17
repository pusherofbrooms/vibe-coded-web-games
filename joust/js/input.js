(function initInputModule() {
  const keyMap = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    Space: "flap",
    ArrowUp: "flap",
    KeyW: "flap",
    KeyP: "pause",
  };

  function setButtonState(button, active) {
    button.classList.toggle("is-active", active);
  }

  function attachInput(state, controls) {
    const downKeys = new Set();
    const touchButtons = controls.touchButtons;

    function onKeyDown(event) {
      const mapped = keyMap[event.code];
      if (!mapped) {
        return;
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
        event.preventDefault();
      }

      if (mapped === "pause") {
        if (!downKeys.has(event.code)) {
          state.input.pausePressed = true;
        }
        downKeys.add(event.code);
        return;
      }

      if (mapped === "flap") {
        if (!downKeys.has(event.code)) {
          state.input.flapPressed = true;
        }
        state.input.flapHeld = true;
        downKeys.add(event.code);
        return;
      }

      state.input[mapped] = true;
      downKeys.add(event.code);
    }

    function onKeyUp(event) {
      const mapped = keyMap[event.code];
      if (!mapped) {
        return;
      }

      downKeys.delete(event.code);

      if (mapped === "flap") {
        state.input.flapHeld = Array.from(downKeys).some((key) => keyMap[key] === "flap");
        return;
      }

      if (mapped === "left" || mapped === "right") {
        state.input[mapped] = Array.from(downKeys).some((key) => keyMap[key] === mapped);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    touchButtons.forEach((button) => {
      const action = button.dataset.action;
      if (!action) {
        return;
      }

      const press = (event) => {
        event.preventDefault();
        button.focus({ preventScroll: true });
        if (action === "flap") {
          state.input.flapHeld = true;
          state.input.flapPressed = true;
        } else {
          state.input[action] = true;
        }
        setButtonState(button, true);
      };

      const release = (event) => {
        event.preventDefault();
        if (action === "flap") {
          state.input.flapHeld = false;
        } else {
          state.input[action] = false;
        }
        setButtonState(button, false);
      };

      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    });

    window.addEventListener("blur", () => {
      state.input.left = false;
      state.input.right = false;
      state.input.flapHeld = false;
    });
  }

  function consumeFrameInput(state) {
    const snapshot = {
      left: state.input.left,
      right: state.input.right,
      flapHeld: state.input.flapHeld,
      flapPressed: state.input.flapPressed,
      pausePressed: state.input.pausePressed,
    };

    state.input.flapPressed = false;
    state.input.pausePressed = false;

    return snapshot;
  }

  window.JoustInput = {
    attachInput,
    consumeFrameInput,
  };
})();
