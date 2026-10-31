using System;

namespace UnityInspect
{
    [Serializable]
    public sealed class UnityInspectPosition
    {
        public float x;
        public float y;
        public float z;
    }

    [Serializable]
    public sealed class UnityInspectIssue
    {
        public string id;
        public string title;
        public string desc;
        public string priority;
        public string status;
        public string scene;
        public UnityInspectPosition pos;
        public string createdAt;
        public string updatedAt;
        public string screenshot;
        public string reporter;
        public string assignee;
        public string deviceCode;
        public int severityScore;
    }

    [Serializable]
    public sealed class UnityInspectIssueListResponse
    {
        public UnityInspectIssue[] items;
        public int page;
        public int pageSize;
        public int total;
    }

    [Serializable]
    public sealed class UnityInspectCreateIssueRequest
    {
        public string title;
        public string desc;
        public string priority;
        public string status;
        public string scene;
        public UnityInspectPosition pos;
        public string screenshot;
        public string reporter;
        public string assignee;
        public string deviceCode;
        public int severityScore;
    }

    [Serializable]
    public sealed class UnityInspectApiErrorResponse
    {
        public UnityInspectApiError error;
    }

    [Serializable]
    public sealed class UnityInspectApiError
    {
        public string code;
        public string message;
    }

    [Serializable]
    public sealed class UnityInspectLabelBounds
    {
        public float xMin;
        public float yMin;
        public float xMax;
        public float yMax;
        public float safeXMin;
        public float safeYMin;
        public float safeXMax;
        public float safeYMax;
    }

    [Serializable]
    public sealed class UnityInspectSmokeResult
    {
        public string status;
        public string apiBaseUrl;
        public int statusCode;
        public int issueCount;
        public int markerCount;
        public int total;
        public string error;
        public int environmentObjectCount;
        public int colliderCount;
        public bool raycastHit;
        public bool duplicateClickRejected;
        public bool cancelRemovedMarker;
        public bool uiClickBlocked;
        public bool cameraNavigationVerified;
        public bool emptyTitleRejected;
        public bool priorityOptionsVerified;
        public bool leftLabelVisible;
        public bool centerLabelVisible;
        public bool rightLabelVisible;
        public UnityInspectLabelBounds leftLabelBounds;
        public UnityInspectLabelBounds centerLabelBounds;
        public UnityInspectLabelBounds rightLabelBounds;
        public bool longTitleLabelVisible;
        public string longTitle;
        public UnityInspectLabelBounds longTitleLabelBounds;
        public bool dynamicPanelLabelVisible;
        public UnityInspectLabelBounds dynamicPanelLabelBounds;
        public bool submitFailureObserved;
        public string submitErrorMessage;
        public string createdId;
        public string createdPriority;
        public string createdScene;
        public float createdX;
        public float createdY;
        public float createdZ;
        public int serverCountAfterCreate;
        public int createStatusCode;
        public int cleanupStatusCode;
        public bool cleanupSucceeded;
        public int finalIssueCount;
        public bool playMode;
        public string completedAtUtc;
    }
}
