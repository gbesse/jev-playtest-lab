using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace Jev.PlaytestLab {
  public sealed class JevPlaytestClient : MonoBehaviour {
    [SerializeField] string endpoint = "http://127.0.0.1:8798/v1/observe";
    public IEnumerator Observe(string observationJson, int expectedRevision, Action<string> onReady, Action<string> onError) {
      using var request = new UnityWebRequest(endpoint, "POST");
      request.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(observationJson));
      request.downloadHandler = new DownloadHandlerBuffer();
      request.SetRequestHeader("Content-Type", "application/json");
      yield return request.SendWebRequest();
      if (request.result != UnityWebRequest.Result.Success) onError(request.error);
      else onReady(request.downloadHandler.text); // Host code must re-check its current revision before execution.
    }
  }
}
