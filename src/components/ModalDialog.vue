<template>
  <div class="modal-backdrop">
    <div
      class="modal"
      role="dialog"
      aria-labelledby="modalTitle"
      aria-describedby="modalDescription"
    >
      <header class="modal-header" id="modalTitle">
        <slot name="header"></slot>
        <button
          type="button"
          class="btn-icon-only"
          aria-label="close dialog"
          @click="close"
        >
          <IconClose />
        </button>
      </header>

      <section class="modal-body" id="modalDescription">
        <slot name="body">This is the default body!</slot>
      </section>

      <footer class="modal-footer">
        <slot name="footer"></slot>
      </footer>
    </div>
  </div>
</template>
<script>
import IconClose from "@/components/icons/IconClose.vue";

export default {
  name: "ModalDialog",
  components: { IconClose },
  methods: {
    close() {
      this.$emit("close");
    },
  },
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal {
  background: #ffffff;
  box-shadow: 2px 2px 20px 1px;
  overflow-x: auto;
  display: flex;
  flex-direction: column;
}

.modal-header,
.modal-footer {
  padding: 10px 15px;
  display: flex;
}

.modal-header {
  position: relative;
  border-bottom: 1px solid #eeeeee;
  background-color: var(--color-heading);
  color: var(--as-color-primary-0);
  justify-content: space-between;
  align-items: center;
  font-size: 1.2em;
}

.modal-footer {
  border-top: 1px solid #eeeeee;
  flex-direction: column;
  justify-content: flex-end;
}

.modal-body {
  position: relative;
  padding: 10px 15px;
}
</style>
