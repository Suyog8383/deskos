package com.visioncamerahandlandmarker;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.BaseReactPackage;
import com.margelo.nitro.visioncamerahandlandmarker.VisionCameraHandLandmarkerOnLoad;


public class VisionCameraHandLandmarkerPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider { emptyMap() }

  companion object {
    init {
      VisionCameraHandLandmarkerOnLoad.initializeNative();
    }
  }
}
