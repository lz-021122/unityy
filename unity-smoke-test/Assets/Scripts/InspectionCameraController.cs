using UnityEngine;
using UnityEngine.InputSystem;

namespace UnityInspect
{
    [RequireComponent(typeof(Camera))]
    public sealed class InspectionCameraController : MonoBehaviour
    {
        private const float RotationSpeed = 0.18f;
        private const float PanSpeed = 0.018f;
        private const float ZoomSpeed = 0.012f;
        private const float MinDistance = 3f;
        private const float MaxDistance = 95f;
        public const float DefaultFieldOfView = 42f;
        public const float DefaultNearClipPlane = 0.05f;
        public const float DefaultFarClipPlane = 250f;
        public const float DefaultYaw = 0f;
        public const float DefaultPitch = 18f;
        public const float DefaultDistance = 28f;
        public static readonly Vector3 DefaultPivot = new Vector3(0f, 0f, 3.2f);

        private Vector3 pivot = DefaultPivot;
        private float yaw = DefaultYaw;
        private float pitch = DefaultPitch;
        private float distance = DefaultDistance;

        public void ResetDefaultView()
        {
            var sceneCamera = GetComponent<Camera>();
            sceneCamera.fieldOfView = DefaultFieldOfView;
            sceneCamera.nearClipPlane = DefaultNearClipPlane;
            sceneCamera.farClipPlane = DefaultFarClipPlane;

            pivot = DefaultPivot;
            yaw = DefaultYaw;
            pitch = DefaultPitch;
            distance = DefaultDistance;
            ApplyTransform();
        }

        public void Focus(Vector3 center, float span, bool snap = true)
        {
            pivot = center;
            if (snap || distance <= 0f)
            {
                distance = Mathf.Clamp(span * 1.15f, MinDistance, MaxDistance);
                yaw = DefaultYaw;
                pitch = DefaultPitch;
            }
            ApplyTransform();
        }

        private void Update()
        {
            var mouse = Mouse.current;
            if (mouse == null || UnityInspectIssueDashboard.PointerOverUi)
            {
                return;
            }

            var delta = mouse.delta.ReadValue();
            if (mouse.rightButton.isPressed && delta.sqrMagnitude > 0f)
            {
                Rotate(delta);
            }

            if (mouse.middleButton.isPressed && delta.sqrMagnitude > 0f)
            {
                Pan(delta);
            }

            var scroll = mouse.scroll.ReadValue().y;
            if (Mathf.Abs(scroll) > 0.01f)
            {
                Zoom(scroll);
            }

            ApplyTransform();
        }

        public void ApplyNavigationForTest(Vector2 delta, string operation, float scroll)
        {
            if (operation == "rotate")
            {
                Rotate(delta);
            }
            else if (operation == "pan")
            {
                Pan(delta);
            }
            else if (operation == "zoom")
            {
                Zoom(scroll);
            }
            ApplyTransform();
        }

        private void Rotate(Vector2 delta)
        {
            yaw += delta.x * RotationSpeed;
            pitch = Mathf.Clamp(pitch - delta.y * RotationSpeed, 8f, 72f);
        }

        private void Pan(Vector2 delta)
        {
            var factor = PanSpeed * distance * 0.08f;
            pivot += -transform.right * delta.x * factor;
            pivot += -transform.up * delta.y * factor;
        }

        private void Zoom(float scroll)
        {
            distance = Mathf.Clamp(
                distance - scroll * ZoomSpeed * distance,
                MinDistance,
                MaxDistance);
        }

        private void ApplyTransform()
        {
            var rotation = Quaternion.Euler(pitch, yaw, 0f);
            transform.position = pivot - rotation * Vector3.forward * distance;
            transform.rotation = rotation;
        }
    }
}
