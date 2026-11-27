---
title: 实时阴影渲染
date: 2025-11-14
description: 介绍实时阴影渲染的基础概念与主要技术，覆盖平面阴影、阴影体、阴影贴图及其软阴影、级联和接触阴影等变体，并讨论质量与性能的权衡。
---

# 实时阴影渲染

- [引言](#%E5%BC%95%E8%A8%80)
- [基础概念](#%E5%9F%BA%E7%A1%80%E6%A6%82%E5%BF%B5)
  * [阴影](#%E9%98%B4%E5%BD%B1)
  * [纹理/贴图](#%E7%BA%B9%E7%90%86%E8%B4%B4%E5%9B%BE)
  * [栅格化](#%E6%A0%85%E6%A0%BC%E5%8C%96)
  * [采样与走样](#%E9%87%87%E6%A0%B7%E4%B8%8E%E8%B5%B0%E6%A0%B7)
- [实时阴影渲染技术](#%E5%AE%9E%E6%97%B6%E9%98%B4%E5%BD%B1%E6%B8%B2%E6%9F%93%E6%8A%80%E6%9C%AF)
  * [一些简单技术](#%E4%B8%80%E4%BA%9B%E7%AE%80%E5%8D%95%E6%8A%80%E6%9C%AF)
  * [平面阴影（Planar Shadow）](#%E5%B9%B3%E9%9D%A2%E9%98%B4%E5%BD%B1planar-shadow)
    + [**背景**](#%E8%83%8C%E6%99%AF)
    + [核心思想](#%E6%A0%B8%E5%BF%83%E6%80%9D%E6%83%B3)
    + [算法流程](#%E7%AE%97%E6%B3%95%E6%B5%81%E7%A8%8B)
    + [**效果**](#%E6%95%88%E6%9E%9C)
    + [**优点**](#%E4%BC%98%E7%82%B9)
    + [缺点](#%E7%BC%BA%E7%82%B9)
  * [阴影体（Shadow Volume）](#%E9%98%B4%E5%BD%B1%E4%BD%93shadow-volume)
    + [**核心思想**](#%E6%A0%B8%E5%BF%83%E6%80%9D%E6%83%B3)
    + [算法流程](#%E7%AE%97%E6%B3%95%E6%B5%81%E7%A8%8B-1)
      - [Z-Pass](#z-pass)
      - [Z-Fail](#z-fail)
    + [效果](#%E6%95%88%E6%9E%9C)
    + [优点](#%E4%BC%98%E7%82%B9)
    + [缺点](#%E7%BC%BA%E7%82%B9-1)
  * [现代阴影技术基础：Shadow Map](#%E7%8E%B0%E4%BB%A3%E9%98%B4%E5%BD%B1%E6%8A%80%E6%9C%AF%E5%9F%BA%E7%A1%80shadow-map)
    + [背景](#%E8%83%8C%E6%99%AF)
    + [核心思想](#%E6%A0%B8%E5%BF%83%E6%80%9D%E6%83%B3)
    + [算法流程](#%E7%AE%97%E6%B3%95%E6%B5%81%E7%A8%8B-2)
    + [**效果**](#%E6%95%88%E6%9E%9C-1)
    + [优点](#%E4%BC%98%E7%82%B9-1)
    + [缺点](#%E7%BC%BA%E7%82%B9-2)
  * [软阴影：PCSS => VSM、MSM](#%E8%BD%AF%E9%98%B4%E5%BD%B1pcss--vsmmsm)
    + [背景](#%E8%83%8C%E6%99%AF-1)
    + [核心思想](#%E6%A0%B8%E5%BF%83%E6%80%9D%E6%83%B3-1)
    + [算法流程](#%E7%AE%97%E6%B3%95%E6%B5%81%E7%A8%8B-3)
    + [效果](#%E6%95%88%E6%9E%9C-1)
    + [其他问题](#%E5%85%B6%E4%BB%96%E9%97%AE%E9%A2%98)
    + [**优点**](#%E4%BC%98%E7%82%B9)
    + [缺点](#%E7%BC%BA%E7%82%B9-3)
    + [其他相关算法](#%E5%85%B6%E4%BB%96%E7%9B%B8%E5%85%B3%E7%AE%97%E6%B3%95)
      - [Variance soft shadow mapping (VSM 或 VSSM)](#variance-soft-shadow-mapping-vsm-%E6%88%96-vssm)
      - [Moment shadow mapping （MSM）](#moment-shadow-mapping-msm)
      - [**Virtual Shadow Mapping（VSM ）+ SMRT**](#virtual-shadow-mappingvsm--smrt)
  * [中远距离阴影：Cascaded Shadow Map （CSM，级联阴影）](#%E4%B8%AD%E8%BF%9C%E8%B7%9D%E7%A6%BB%E9%98%B4%E5%BD%B1cascaded-shadow-map-csm%E7%BA%A7%E8%81%94%E9%98%B4%E5%BD%B1)
    + [背景](#%E8%83%8C%E6%99%AF-2)
    + [核心思想](#%E6%A0%B8%E5%BF%83%E6%80%9D%E6%83%B3-2)
    + [算法流程](#%E7%AE%97%E6%B3%95%E6%B5%81%E7%A8%8B-4)
    + [效果](#%E6%95%88%E6%9E%9C-2)
    + [优点](#%E4%BC%98%E7%82%B9-2)
    + [缺点](#%E7%BC%BA%E7%82%B9-4)
  * [远距离阴影：Distance Field Shadow Map](#%E8%BF%9C%E8%B7%9D%E7%A6%BB%E9%98%B4%E5%BD%B1distance-field-shadow-map)
    + [背景](#%E8%83%8C%E6%99%AF-3)
    + [相关工作](#%E7%9B%B8%E5%85%B3%E5%B7%A5%E4%BD%9C)
      - [SDF](#sdf)
      - [Ray marching](#ray-marching)
    + [算法流程](#%E7%AE%97%E6%B3%95%E6%B5%81%E7%A8%8B-5)
    + [优点](#%E4%BC%98%E7%82%B9-3)
    + [缺点](#%E7%BC%BA%E7%82%B9-5)
  * [近距离阴影：Contact Shadow (SSAO=>HBAO、SSDO、DFAO)](#%E8%BF%91%E8%B7%9D%E7%A6%BB%E9%98%B4%E5%BD%B1contact-shadow-ssaohbaossdodfao)
    + [背景](#%E8%83%8C%E6%99%AF-4)
    + [**核心思想**](#%E6%A0%B8%E5%BF%83%E6%80%9D%E6%83%B3-1)
    + [**算法流程**](#%E7%AE%97%E6%B3%95%E6%B5%81%E7%A8%8B)
    + [**效果**](#%E6%95%88%E6%9E%9C-2)
    + [**优点**](#%E4%BC%98%E7%82%B9-1)
    + [**缺点**](#%E7%BC%BA%E7%82%B9)
    + [**其他相关算法**](#%E5%85%B6%E4%BB%96%E7%9B%B8%E5%85%B3%E7%AE%97%E6%B3%95)
  * [反射阴影：SSR（Screen Space Reflection）](#%E5%8F%8D%E5%B0%84%E9%98%B4%E5%BD%B1ssrscreen-space-reflection)
    + [背景](#%E8%83%8C%E6%99%AF-5)
    + [核心思想](#%E6%A0%B8%E5%BF%83%E6%80%9D%E6%83%B3-3)
    + [算法流程](#%E7%AE%97%E6%B3%95%E6%B5%81%E7%A8%8B-6)
    + [效果](#%E6%95%88%E6%9E%9C-3)
    + [优点](#%E4%BC%98%E7%82%B9-4)
    + [缺点](#%E7%BC%BA%E7%82%B9-6)
  * [高分辨率：Virtual Shadow Maps（VSM，虚拟阴影贴图）](#%E9%AB%98%E5%88%86%E8%BE%A8%E7%8E%87virtual-shadow-mapsvsm%E8%99%9A%E6%8B%9F%E9%98%B4%E5%BD%B1%E8%B4%B4%E5%9B%BE)
    + [背景](#%E8%83%8C%E6%99%AF-6)
    + [核心思想](#%E6%A0%B8%E5%BF%83%E6%80%9D%E6%83%B3-4)
    + [算法流程](#%E7%AE%97%E6%B3%95%E6%B5%81%E7%A8%8B-7)
    + [效果](#%E6%95%88%E6%9E%9C-4)
    + [优点](#%E4%BC%98%E7%82%B9-5)
    + [**缺点**](#%E7%BC%BA%E7%82%B9-1)
    + [**工程注意事项**](#%E5%B7%A5%E7%A8%8B%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9)
  * [Ray Traced Shadow](#ray-traced-shadow)
- [在淘宝中的应用](#%E5%9C%A8%E6%B7%98%E5%AE%9D%E4%B8%AD%E7%9A%84%E5%BA%94%E7%94%A8)
- [编程实战 - Shadowmap](#%E7%BC%96%E7%A8%8B%E5%AE%9E%E6%88%98---shadowmap)
- [总结](#%E6%80%BB%E7%BB%93)
- [相关文章](#%E7%9B%B8%E5%85%B3%E6%96%87%E7%AB%A0)

---

## <font style="color:rgb(38, 38, 38);">引言</font>
![1763056060929-c96c5d8c-8f0d-45c2-9524-1d20cb34c841.png](./img/Ve8KnW-95sb_0-hW/1763056060929-c96c5d8c-8f0d-45c2-9524-1d20cb34c841-593054.png)![1763056068453-14f86abd-33f8-479b-b16e-7c30a10f78ae.png](./img/Ve8KnW-95sb_0-hW/1763056068453-14f86abd-33f8-479b-b16e-7c30a10f78ae-714467.png)

<font style="color:rgb(38, 38, 38);"></font>

<font style="color:rgb(38, 38, 38);">阴影是视觉真实感的关键组成部分，它直接关系到人对场景的深度感知和空间定位。丢弃物体的阴影将会给观察者带来强烈的</font>**<font style="color:rgb(38, 38, 38);">悬空感</font>**<font style="color:rgb(38, 38, 38);">和</font>**<font style="color:rgb(38, 38, 38);">不真实感</font>**<font style="color:rgb(38, 38, 38);">。近几个月苹果新推出的 VR 设备 vision pro 就通过为 UI 在真实世界生成投影，来提示用户 UI 的空间位置，并使得虚拟UI更好地与现实世界相融合。</font>

<font style="color:rgb(38, 38, 38);"></font>

<font style="color:rgb(38, 38, 38);">然而，实时阴影渲染技术面临着巨大的技术挑战。考虑到用户体验和技术的实用性，我们需要在有限的计算资源下，平衡</font>**<font style="color:rgb(38, 38, 38);">渲染质量</font>**<font style="color:rgb(38, 38, 38);">与</font>**<font style="color:rgb(38, 38, 38);">性能开销</font>**<font style="color:rgb(38, 38, 38);">（一般来说，显示器的刷新率为60Hz，这就要求引擎在16.7ms内完成计算和渲染）。</font>

<font style="color:rgb(38, 38, 38);"></font>

<font style="color:rgb(38, 38, 38);">本文将介绍一些常用的阴影生成技术。首先，本文会介绍一些相关的基础概念，以帮助大家更好地理解文章内容；然后，会循序渐进地介绍一些实时渲染中常用的阴影渲染技术；最后，会通过一个经典算法的代码实现，来加深大家对算法的理解。</font>

<font style="color:rgb(38, 38, 38);"></font>

<font style="color:rgb(38, 38, 38);">本文仅探讨实时生成阴影的算法，并不涵盖实时光线追踪等用于模拟全局光照效果的高级技术。而且，即便这些高级技术可以生成更加真实的效果，受硬件资源和设备兼容性的限制（特别是移动端）大多数游戏仍然依赖于经典的、效率更高的阴影生成技术。</font>

## <font style="color:rgb(38, 38, 38);">基础概念</font>
### <font style="color:rgb(38, 38, 38);">阴影</font>
+ **<font style="color:rgb(38, 38, 38);">硬阴影：</font>**<font style="color:rgb(38, 38, 38);">阴影边缘非常清晰和锐利的阴影。</font>
+ **<font style="color:rgb(38, 38, 38);">软阴影：</font>**<font style="color:rgb(38, 38, 38);">阴影边缘具有一定程度的模糊和渐变的阴影。</font>
+ **<font style="color:rgb(38, 38, 38);">全影（Umbra）</font>**<font style="color:rgb(38, 38, 38);">: 阴影的最暗部分，其中遮挡物体完全阻挡了光源的光线。在这个区域内，观察者无法看到任何来自光源的直接光线。</font>
+ **<font style="color:rgb(38, 38, 38);">半影（Penumbra</font>**<font style="color:rgb(38, 38, 38);">）: 阴影的过渡部分，其中遮挡物体只阻挡了光源的一部分光线。半影区产生了柔和的阴影边缘，光线强度从阴影区（Umbra）到非阴影区域逐渐增强。</font>
+ **<font style="color:rgb(38, 38, 38);">自投阴影</font>**<font style="color:rgb(38, 38, 38);">（Self-Shadowing）：物体的一部分遮挡了光源到该物体其他部分的光线，使得物体自身的一部分在另一部分上投影出阴影。</font>

![1763056498289-e0967827-eebd-4587-8c03-706f41c5b4c2.png](./img/Ve8KnW-95sb_0-hW/1763056498289-e0967827-eebd-4587-8c03-706f41c5b4c2-515359.png)

![1763056492859-13014405-66eb-4997-ac55-d129dd12d42d.png](./img/Ve8KnW-95sb_0-hW/1763056492859-13014405-66eb-4997-ac55-d129dd12d42d-630625.png)



### <font style="color:rgb(38, 38, 38);">纹理/贴图</font>
<font style="color:rgb(38, 38, 38);">可以简单理解为一张 2D 图片。（也有3D的）</font>

<font style="color:rgb(38, 38, 38);">根本目的：定义物体任意一个点的属性。</font>

![1763056421831-8a870a52-b2c6-47ac-91be-fa1a1fb22967.png](./img/Ve8KnW-95sb_0-hW/1763056421831-8a870a52-b2c6-47ac-91be-fa1a1fb22967-640380.png)



![1763056429134-57a74c93-6074-4aae-8ef0-d220cd1413b0.png](./img/Ve8KnW-95sb_0-hW/1763056429134-57a74c93-6074-4aae-8ef0-d220cd1413b0-483015.png)

### 栅格化
![1763056231171-648b0a61-46a8-4dc3-8b72-f90702f96670.png](./img/Ve8KnW-95sb_0-hW/1763056231171-648b0a61-46a8-4dc3-8b72-f90702f96670-533828.png)

<font style="color:rgb(38, 38, 38);">从相机向场景看去，形成一个</font>视锥<font style="color:rgb(38, 38, 38);">。视锥又被 近平面 和 远平面 截断，只有中间有颜色的空间中的物体才可以被相机看到。特别地，图中黄色的近平面就是我们的屏幕。空间中所有的物体会沿相机方向被“挤压”、“拍扁”到近平面上，这个“挤压“的过程被称为“</font>投影<font style="color:rgb(38, 38, 38);">”。</font>

![1763056252320-910594fa-f491-4a34-b109-1a29835f252e.png](./img/Ve8KnW-95sb_0-hW/1763056252320-910594fa-f491-4a34-b109-1a29835f252e-483846.png)

<font style="color:rgb(38, 38, 38);">场景中的物体被拍扁投影到屏幕上，将图形以离散的方式存储下来。图中，空间中的三角体被投影到了屏幕，屏幕对应的像素点记录了相应的颜色信息。</font>

### <font style="color:rgb(38, 38, 38);">采样与走样</font>
<font style="color:rgb(38, 38, 38);">采样，带来走样</font>

![1763056295965-34ec0e69-c88e-4b97-bb47-b09ad53de316.png](./img/Ve8KnW-95sb_0-hW/1763056295965-34ec0e69-c88e-4b97-bb47-b09ad53de316-237038.png)![1763056300623-3a7774c4-a423-49e9-9a40-fb9eb8b0e59e.png](./img/Ve8KnW-95sb_0-hW/1763056300623-3a7774c4-a423-49e9-9a40-fb9eb8b0e59e-961585.png)![1763056309555-d5f15c58-108a-48f9-8f67-662bdf1bb5b2.png](./img/Ve8KnW-95sb_0-hW/1763056309555-d5f15c58-108a-48f9-8f67-662bdf1bb5b2-490649.png)

![1763056381864-d2ac17ae-76d9-4a82-8c89-46c3ee4bca2e.png](./img/Ve8KnW-95sb_0-hW/1763056381864-d2ac17ae-76d9-4a82-8c89-46c3ee4bca2e-449326.jpg)

## <font style="color:rgb(38, 38, 38);">实时阴影渲染技术</font>
### <font style="color:rgb(38, 38, 38);">一些简单技术</font>
**<font style="color:rgb(38, 38, 38);">没有阴影</font>**<font style="color:rgb(38, 38, 38);">：早期的游戏中，是没有阴影的。（精灵宝可梦红绿、金银）</font>

![1763107396764-4fbd7b54-6b35-4481-bb3a-8c89253c0988.png](./img/Ve8KnW-95sb_0-hW/1763107396764-4fbd7b54-6b35-4481-bb3a-8c89253c0988-645638.jpg)

<font style="color:rgb(38, 38, 38);"></font>

<font style="color:rgb(38, 38, 38);">随着硬件的发展，尤其是自从任天堂推出了更先进的掌上游戏机，如Game Boy Advance和后来的任天堂DS，游戏中开始出现更为复杂的图形和效果，包括基本的阴影效果。</font>

**<font style="color:rgb(38, 38, 38);"></font>**

**<font style="color:rgb(38, 38, 38);">静态阴影</font>**<font style="color:rgb(38, 38, 38);">：2002年发行的《精灵宝可梦 红宝石·蓝宝石》（Pokemon Ruby and Sapphire）版本在Game Boy Advance上就提供了更为丰富的图形表现，包括角色和物体的静态阴影。角色和某些物体通常带有一个固定在其下方的简单黑色或灰色图案，模拟阴影效果。图案通过更简单的2D图像处理和图层叠加来实现，不会根据光源位置变化而变化，也不会投射到其他物体上。</font>



![1763056608929-1e68f1a8-75e5-4919-9e81-5ded972e7f10.png](./img/Ve8KnW-95sb_0-hW/1763056608929-1e68f1a8-75e5-4919-9e81-5ded972e7f10-651294.png)![1763056613320-9cc704b1-b0d4-4297-badc-11de5f043913.png](./img/Ve8KnW-95sb_0-hW/1763056613320-9cc704b1-b0d4-4297-badc-11de5f043913-481260.png)



**<font style="color:rgb(38, 38, 38);">阴影动画</font>**<font style="color:rgb(38, 38, 38);">：为了增加阴影的动态感，有时开发者会采用一个事先做好的阴影动画，放在人物脚底。比椭圆要精致许多。在部分PS2时代的游戏当中可以看到。</font>  


**<font style="color:rgb(38, 38, 38);">阴影烘焙</font>**<font style="color:rgb(38, 38, 38);">（shadow baking）：阴影烘焙是一种经常使用的技术，它会预先渲染场景光照和阴影，然后将这些信息存储在纹理贴图中。这种技术尤其适合</font>**<font style="color:rgb(38, 38, 38);">静态场景</font>**<font style="color:rgb(38, 38, 38);">，即那些场景和光源位置固定不变的游戏，可以在不牺牲视觉效果的同时减轻实时渲染的性能负担。在守望先锋、刺客信条等大量现代游戏中被广泛使用。</font>

<font style="color:rgb(38, 38, 38);"></font>

+ <font style="color:rgb(38, 38, 38);">阴影烘焙到 light map：预烘焙的Lightmap的ShadowMask，将阴影烘焙到每个物体的LightMap的Alpha通道上，作为ShadowMask，渲染时采样Lightmap，然后根据距离和近景动态的实时阴影进行混合。</font>
    - ![1763056652249-8e446c0b-34ea-41f2-bb18-4223dd91a669.png](./img/Ve8KnW-95sb_0-hW/1763056652249-8e446c0b-34ea-41f2-bb18-4223dd91a669-586257.png)
+ <font style="color:rgb(38, 38, 38);">阴影烘焙到物体 texture：许多游戏也用这种技术来实现物体自阴影效果（物体自己各个部分互相遮挡，带来的自身投射到自身的阴影），如著名的魔兽世界</font>
+ <font style="color:rgb(38, 38, 38);">。。。。</font>

![1763056673043-cbad2b7a-c02e-4f81-a403-ce75144d5519.png](./img/Ve8KnW-95sb_0-hW/1763056673043-cbad2b7a-c02e-4f81-a403-ce75144d5519-629813.png)![1763056679828-c8b036e0-e60c-4a39-a0cc-04a8f397f51d.png](./img/Ve8KnW-95sb_0-hW/1763056679828-c8b036e0-e60c-4a39-a0cc-04a8f397f51d-068778.png)

![1763056695728-8b9da824-dec7-490e-9fbf-27ec437eb873.png](./img/Ve8KnW-95sb_0-hW/1763056695728-8b9da824-dec7-490e-9fbf-27ec437eb873-702169.png)



### <font style="color:rgb(38, 38, 38);">平面阴影（Planar Shadow）</font>
#### **<font style="color:rgb(38, 38, 38);">背景</font>**
<font style="color:rgb(38, 38, 38);">无论是静态阴影还是动态阴影，阴影都不受光源、人物动作影响。不是渲染出来的，只是简单的模拟。</font>

#### <font style="color:rgb(38, 38, 38);">核心思想</font>
比静态阴影中的小圆盘更复杂一点的阴影技术叫做平面阴影。平面阴影基于一个简单的观察：物体在平面上的投影还是能够清晰地保持自身的轮廓，就好像模型被压扁在平面上了。

#### 算法流程
![1763056795485-79207e6a-f6aa-455c-8025-0d6ce9bfc4fa.png](./img/Ve8KnW-95sb_0-hW/1763056795485-79207e6a-f6aa-455c-8025-0d6ce9bfc4fa-392889.png)

#### **<font style="color:rgb(38, 38, 38);">效果</font>**
代表游戏：王者荣耀。

可能会用到从脚部到头部的阴影的半透明过渡。



![1763056824915-d029b99a-cd5c-45b3-9e96-b93233ebb225.png](./img/Ve8KnW-95sb_0-hW/1763056824915-d029b99a-cd5c-45b3-9e96-b93233ebb225-093009.png)![1763056830368-85672b55-7c4b-4469-9b30-82eba5103362.png](./img/Ve8KnW-95sb_0-hW/1763056830368-85672b55-7c4b-4469-9b30-82eba5103362-840009.png)

#### **优点**
1. 实现简单
2. 性能消耗低
3. 兼容各种垃圾手机型号，不会出现卡爆机器的问题

#### 缺点
1. 硬阴影
2. 遇到地面上的任何一点凹凸不平都会把影子卡掉
3. z-fighting （通过控制渲染顺序或抬高阴影来解决）
4. 半透明叠加问题（半透明叠加通过 stencil buffer 来解决）
5. 和其他角色以及场景烘焙的影子无法融合

![1763056884895-45035ab3-a7ec-4950-8561-2f71b44b5ab3.png](./img/Ve8KnW-95sb_0-hW/1763056884895-45035ab3-a7ec-4950-8561-2f71b44b5ab3-849836.png)![1763056890204-92d36b32-6400-4070-bdf0-e1d5e10d5bb0.png](./img/Ve8KnW-95sb_0-hW/1763056890204-92d36b32-6400-4070-bdf0-e1d5e10d5bb0-771423.png)



### <font style="color:rgb(51, 51, 51);">阴影体（</font><font style="color:rgb(38, 38, 38);">Shadow Volume）</font>
<font style="color:rgb(38, 38, 38);">Shadow Volume 由Frank Crow在1977年提出，是个比较古老的技术，虽然现在已经鲜有游戏使用。</font>

#### **<font style="color:rgb(38, 38, 38);">核心思想</font>**
在三维空间中构建一个由物体相对于光源的位置生成的虚拟体积（Shadow Volume），即图中的绿色区域（绿色体积内的点都看不到光）。

然后假设 Volume 内（绿色区域）的点都不可以被光照到；Volume 之外（白色区域）的点可以被光照到。

所以问题的关键是，如何判断一个点是否位于阴影体内部。

![1763056971590-b886b590-d88a-4b23-b1b5-2d6a7a6f92e0.png](./img/Ve8KnW-95sb_0-hW/1763056971590-b886b590-d88a-4b23-b1b5-2d6a7a6f92e0-770574.png)

#### 算法流程
##### Z-Pass
![1763057016950-8afa2ec4-23aa-46e9-82ff-cc56cd12b655.png](./img/Ve8KnW-95sb_0-hW/1763057016950-8afa2ec4-23aa-46e9-82ff-cc56cd12b655-027378.png)

1. 屏幕上任一点发射一条线段
2. 线段每进入一个阴影体，就让交点数+1，反之离开一个阴影体，就让交点数-1
3. 如果最终所有交点数（Shadow Volume Count）为0，则表示当前点位于阴影体之外，若交点数大于0，则表示当前点位于阴影体内。

##### Z-Fail
Z-Pass 基于一个假设：摄像机本身是位于阴影体外的，但实际情况往往并非如此。

不同于ZPass的算法，这次线段发射的起点位于距离摄像机无限远处（保证这个点一定是位于阴影体外的），然后我们每次遇到阴影体背面，就让Stencil Value +1，遇到阴影体正面，就让Stencil Value-1，其他设定均不变。

#### 效果
荒野大镖客

![1763057074746-35a38c3f-cc20-49b6-95bf-45e169c4915f.png](./img/Ve8KnW-95sb_0-hW/1763057074746-35a38c3f-cc20-49b6-95bf-45e169c4915f-194873.png)

#### 优点
1. 没有shadow map的采样问题。能够产生非常精确的阴影边缘
2. 对于静态场景和动态光源，或者动态物体和静态光源都同样适用。
3. 在一些不需要太多投影对象的场景，投影距离较近或者硬阴影时Shadow Volume会比ShadowMap更合适ShadowMap要做到高精度需要较大分辨率才能保证阴影的锯齿感不明显。

#### 缺点
硬阴影

需要大量的几何计算，尤其是在场景中有许多复杂物体时，以及无法处理软阴影或半透明阴影效果。

### 现代阴影技术基础：Shadow Map
#### 背景
栅格化

![1763056252320-910594fa-f491-4a34-b109-1a29835f252e.png](./img/Ve8KnW-95sb_0-hW/1763056252320-910594fa-f491-4a34-b109-1a29835f252e-483846.png)

<font style="color:rgb(38, 38, 38);">场景中的物体被拍扁投影到屏幕上，将图形以离散的方式存储下来。图中，空间中的三角体被投影到了屏幕，屏幕对应的像素点记录了相应的颜色信息。</font>



#### 核心思想
如果一个像素点不在阴影中，那么它必须**同时被灯光和相机**看到。

利用栅格化来做阴影。

#### 算法流程
如何做？渲染两趟

原始场景（没有阴影）：

![1763057291490-2189a88b-3f54-4f8e-8e8f-6bc4884ccf6f.png](./img/Ve8KnW-95sb_0-hW/1763057291490-2189a88b-3f54-4f8e-8e8f-6bc4884ccf6f-361046.png)



第一趟：从光源处看，生成一个图。不做着色，只记录深度。（记录被光看到的点）

![1763057323359-d9338a68-529f-4605-b576-0326b3c55c6d.png](./img/Ve8KnW-95sb_0-hW/1763057323359-d9338a68-529f-4605-b576-0326b3c55c6d-545612.png)

第二趟：从摄像机处看。对于看到的每一个点，投影回光源，可以得到该点对应在深度图里的像素位置。对比该点的深度和深度图里记录的深度，如果深度相同，这个点就可以被看到，不在阴影中；否则，在阴影中。（被相机看到的点，是否被光看到）

![1763057369392-3afe5c9c-9c50-4039-b11d-9d1ed663aa14.png](./img/Ve8KnW-95sb_0-hW/1763057369392-3afe5c9c-9c50-4039-b11d-9d1ed663aa14-308311.png)

关键点：Shadow Map 记录了光到场景的最小深度。借助Shadow Map，场景在渲染时，每个着色点就可以根据距离来判断自己是否被遮住，进而选择保持原色或涂黑。

#### **<font style="color:rgb(38, 38, 38);">效果</font>**
![1763057422220-a0878ce2-4d62-4611-bdb7-f17cb96f0db5.png](./img/Ve8KnW-95sb_0-hW/1763057422220-a0878ce2-4d62-4611-bdb7-f17cb96f0db5-503487.png)

#### 优点
最常用的方法

1. 用于任何大小和形状的物体，包括动态物体和静态场景
2. 大型场景下，shadow mapping通常比 Shadow Volumes 等其他高级方法更加高效
3. 不需要知道场景的几何信息
4. 可扩展到软阴影
5. 可以与其他技术（如级联阴影映射Cascaded Shadow Maps）结合，以支持大范围场景的高质量阴影

#### 缺点
1. <font style="color:#DF2A3F;">self occlusion</font>（自遮挡）/ self-shadowed（自阴影）/ shadow acne（阴影暗斑、阴影失真） 问题。
    1. 问题：shadow map 是有分辨率的。在一个像素内部，深度是一个固定值。这会导致自遮挡（self occlusion）或者说 Shadow acne 问题。图中，人的眼睛望向一个平面。shadow map 认为 眼睛看到的点到光源的距离 是 黄色平面到光源的距离；而实际渲染时会发现实际距离大于shadow map的值。这就使得本来平整的地面出现了阴影。这个问题就是自遮挡问题。从上往下照时，问题最小；几乎平行照向地面时问题最大。
        1. ![1763057506610-03a6e050-2c8d-4ec4-bf94-ef5c77bed010.png](./img/Ve8KnW-95sb_0-hW/1763057506610-03a6e050-2c8d-4ec4-bf94-ef5c77bed010-270309.png)
        2. ![1763057515580-a6ce9bcb-bd09-42ff-809a-56816beaf874.png](./img/Ve8KnW-95sb_0-hW/1763057515580-a6ce9bcb-bd09-42ff-809a-56816beaf874-883022.png)
    2. 解决方法：
        1. Bias，bias 甚至可以随着光照角度的变化而变化。但是Bias过大时会产生丢失影子的问题。下图中，角色的脚与影子分离了，工业界也称为 peter panning (阴影悬浮)。虽然有一些问题，但工业界一般就采用这一增加bias的方法。本文后续的编程实战中也采用了这一方法。
            1. ![1763057537116-6bc7c784-6231-4964-b827-591d1767fe10.png](./img/Ve8KnW-95sb_0-hW/1763057537116-6bc7c784-6231-4964-b827-591d1767fe10-014539.png)
        2. Normal Bias。将 Normal Bias 值设置得太高会使阴影对于游戏对象来说太窄：
            1. ![1763057560261-d4ff4000-7d12-4d24-be59-2c1a1d981fad.png](./img/Ve8KnW-95sb_0-hW/1763057560261-d4ff4000-7d12-4d24-be59-2c1a1d981fad-726765.png)
        3. Shadow pancaking
            1. 该技术旨在减少沿光照方向渲染阴影贴图时使用的光照空间范围。本质是提高阴影贴图的精度，减少阴影暗斑。
            2. ![1763057577694-1c50ee0f-029e-4473-952f-aad97fb52452.png](./img/Ve8KnW-95sb_0-hW/1763057577694-1c50ee0f-029e-4473-952f-aad97fb52452-450516.png)
2. <font style="color:#DF2A3F;">数值精度</font>导致边缘脏。一个像素包含很多点，不同点实际深度不同，而浮点和浮点判断相等是一个非常困难的事情。
3. 只支持<font style="color:#DF2A3F;">点光源</font>
4. aliasing（<font style="color:#DF2A3F;">走样</font>）。Shadow map 的分辨率是个问题
    1. 问题：太小可能会导致锯齿（远距离需要大分辨率），太大浪费存储空间计算能力，且会产生自遮挡问题（近距离需要大分辨率）
    2. 解决方案：
        1. 中远距离： CSM
        2. 远距离： DFSM
        3. 近距离： Contact Shadow （AO，环境光遮蔽）
        4. 支持大分辨率：VSM
5. 生成的是<font style="color:#DF2A3F;">硬阴影</font>
    1. 问题：不够真实
        1. 硬：
            1. ![1763057740771-9845feff-c36f-40a1-91c0-57efcde7d43e.png](./img/Ve8KnW-95sb_0-hW/1763057740771-9845feff-c36f-40a1-91c0-57efcde7d43e-275900.png)
        2. 软：
            1. ![1763057754892-329f933f-7e04-4a06-8efb-bfadda3604ae.png](./img/Ve8KnW-95sb_0-hW/1763057754892-329f933f-7e04-4a06-8efb-bfadda3604ae-498380.png)
    2. 解决方案：
        1. PCSS、VSM、MSM

### 软阴影：PCSS => VSM、MSM
#### 背景
<font style="color:rgb(38, 38, 38);">传统的shadow map只支持点光源和直接光源，点光源生成硬阴影。 为了实现面光源的软阴影，可以将面光源视为点光源来生成shadow map，再利用</font>**<font style="color:rgb(38, 38, 38);">PCSS（Percentage Closer Soft Shadows）</font>**<font style="color:rgb(38, 38, 38);">来生成软阴影。</font>

![1763057884475-8883da0f-7080-4318-a8e5-640b18a7faaf.png](./img/Ve8KnW-95sb_0-hW/1763057884475-8883da0f-7080-4318-a8e5-640b18a7faaf-708023.png)

#### 核心思想
PCF（Percentage Closer Filtering，百分比渐近滤波） + 一个适应性的 filtering size

PCF最初被提出来不是做阴影，而是做抗锯齿。而PCSS用PCF来做阴影。

PCF核心思想：不是先filter再compare，而是先compare再filter

![1763057907111-346aa82d-8d36-4eb6-931d-938803d0ee85.png](./img/Ve8KnW-95sb_0-hW/1763057907111-346aa82d-8d36-4eb6-931d-938803d0ee85-586937.png)

![1763057914374-d1a00f7a-2c60-41d1-8f8f-523704b3f8b6.png](./img/Ve8KnW-95sb_0-hW/1763057914374-d1a00f7a-2c60-41d1-8f8f-523704b3f8b6-786633.png)

简单来说，不是找shadow map中的一个像素来做深度比较，而是在shadow map中找一个区域（一般为7*7区域）的像素的来做深度比较。比较之后，取均值。



#### 算法流程
![1763058035788-ceee9f31-8660-46f2-90b0-c1aba459f279.png](./img/Ve8KnW-95sb_0-hW/1763058035788-ceee9f31-8660-46f2-90b0-c1aba459f279-525076.png)

在讲算法流程前，先考虑一个问题：阴影在什么地方硬，在什么地方软？

观察：阴影的接受物（纸）到阴影的投射物（笔）距离越近，阴影越硬。笔尖硬，越远越软。

结论：不同地方采用不同大小的filtering size。blocker distance 小的地方采用小的filtering size。利用相似三角形来确定filtering size （半影范围）。



PCF结合这一观察，就得到了最终算法流程：

1. Step 1: Blocker search (getting the average blocker depth in a certain region)
    1. 求n*n范围内遮挡物的平均深度，非遮挡物直接忽略不用来求平均。
    2. ![1763058114293-8f487475-a8c1-4410-bcf9-ff51e92ff8cc.png](./img/Ve8KnW-95sb_0-hW/1763058114293-8f487475-a8c1-4410-bcf9-ff51e92ff8cc-706771.png)
2. Step 2: Penumbra estimation (use the average blocker depth to determine filter size)
    1. ![1763058128278-ae452ab4-9293-488c-b995-f54511ff1096.png](./img/Ve8KnW-95sb_0-hW/1763058128278-ae452ab4-9293-488c-b995-f54511ff1096-248128.png)
3. Step 3: Percentage Closer Filtering
    1. ![1763058151750-14ba885d-1ef4-48bd-a37e-5b8e9dab96fb.png](./img/Ve8KnW-95sb_0-hW/1763058151750-14ba885d-1ef4-48bd-a37e-5b8e9dab96fb-873258.png)

#### 效果
![1763058197256-f9e7c533-1667-480b-ad94-c4aea2c2d3f7.png](./img/Ve8KnW-95sb_0-hW/1763058197256-f9e7c533-1667-480b-ad94-c4aea2c2d3f7-286615.png)

#### 其他问题
+ Which region to perform blocker search?
    - Method1: Can be set constant (e.g. 5x5), but can be better with heuristics
    - Method2: Depends on the light size, and reviever's distance from the light.

![1763058223906-03e584a7-aaea-4cfd-882d-e3b1482d2397.png](./img/Ve8KnW-95sb_0-hW/1763058223906-03e584a7-aaea-4cfd-882d-e3b1482d2397-734080.png)



#### **<font style="color:rgb(38, 38, 38);">优点</font>**
模拟了软阴影

#### 缺点
开销非常大

#### 其他相关算法
##### Variance soft shadow mapping (VSM 或 VSSM)
**目的**：加速 PCSS 的步骤1和步骤2。相比 PCSS，VSSM 提供了更快的 blocker search 和 filtering。

**核心不等式**：切比雪夫不等式

![1763058374687-87d36ed7-4bc6-4101-b3b0-55c27271d4bb.png](./img/Ve8KnW-95sb_0-hW/1763058374687-87d36ed7-4bc6-4101-b3b0-55c27271d4bb-781316.png)

**核心思想**：避免效率低下的采样过程，利用单次范围查询代替多次点查询，以加速 Blocker search 和 PCF。

##### Moment shadow mapping （MSM）
+ 解决的问题：VSSM 中，有时不能假设为正态分布。
+ 解决方式：用高阶矩（一般前4阶）来表示分布。VSSM 是用的前二阶矩（均值和方差）来表示分布。
    - 牵扯到一个复杂计算：给定前四阶矩，如何生成 PDF 函数

##### **<font style="color:rgb(38, 38, 38);">Virtual Shadow Mapping（VSM ）+ SMRT</font>**
+ 背景：SMRT是UE5的VSM使用的阴影采样算法，
+ 解决的问题：在VSM中使用SMRT能生成更为真实的柔和阴影和接触硬阴影。
    - 之前UE4使用的PCF不仅不能实现远软近硬的阴影，而且会减少高精度几何体投射阴影的细节，在需要近距离清晰阴影的情况下的阴影效果往往过于模糊。
    - SMRT 用于替代传统阴影渲染中的PCF(Percentage Closer Filtering)/PCSS(Percentage Closer Soft Shadow)，使得物体投射的远处阴影比近处阴影拥有更柔和的效果，更加符合现实的物理效果。
+ 解决方式：SMRT算法的工作原理是在屏幕中每个像素对应的位置大致向着光源方向按照一定的范围均匀发射多条射线来做阴影遮挡检测的判断，不过它并不像传统的光线追踪一样计算光线与几何体的相交点，而是通过在每条射线上步进采样一定数量的点并结合shadowmap上采样到的最近深度值来判断该射线是否撞击到障碍物，根据撞击到障碍物的射线数量来计算软阴影的值，显然相比之前的PCF采样方法这种做法更加Physically based，可实现远软近硬的阴影效果。以往的PCF只是在shadowmap上当前点的周围以相同的filter size均匀采样一些深度做比较，而SMRT改为由光线追踪的方式在shadowmap上不同的filter size范围采样。

### 中远距离阴影：Cascaded Shadow Map （CSM，级联阴影）
#### 背景
Shadow Map 存在走样问题

#### 核心思想
CSM的实现方式是将最高分辨率的阴影贴图用于最靠近摄像机的区域，因为这部分区域的细节最需要被捕捉。随着离摄像机距离的增加，使用更低分辨率的阴影贴图，因为在远处的细节不需要那么精确。这样既保证了近处阴影的质量，又优化了远处阴影的性能。

![1763058479514-5e48df86-004f-48f5-97aa-c5e70af157de.png](./img/Ve8KnW-95sb_0-hW/1763058479514-5e48df86-004f-48f5-97aa-c5e70af157de-617403.png)

#### 算法流程
#### 效果
刺客信条奥德赛使用了4级的CSM渲染近景的阴影，使用了两张ShadowMap渲染远处的阴影，一张远景和一张超远景。远景只有地形、石头，超远景就只有地形简模了。

![1763058520661-5b98ded9-71d8-4c69-ae6c-f25c6f109a99.png](./img/Ve8KnW-95sb_0-hW/1763058520661-5b98ded9-71d8-4c69-ae6c-f25c6f109a99-383205.png)

原神使用了8级CSM

![1763058533291-ecc19214-d42a-4ff4-9997-27be0c576865.png](./img/Ve8KnW-95sb_0-hW/1763058533291-ecc19214-d42a-4ff4-9997-27be0c576865-547908.png)

![1763058541530-405efa98-3bb0-4e6f-949e-cd997058c839.png](./img/Ve8KnW-95sb_0-hW/1763058541530-405efa98-3bb0-4e6f-949e-cd997058c839-922610.png)

#### 优点
1. 性能与质量平衡：CSM通过将视野划分为几个不同的阴影贴图（级联），每个级联用不同分辨率的阴影贴图，可以在接近摄像机的地方提供高质量的阴影，同时保持远处阴影的性能。
2. 广泛支持：CSM被广泛支持并在许多现代游戏引擎中实现，因为它是一个成熟的、经过时间验证的解决方案。
3. 调整灵活：开发者可以根据需要调整各个级联的数量、大小和过渡区域，以实现所需的性能和视觉质量的平衡。
4. 无需预计算：与静态阴影解决方案（如光照贴图）不同，CSM为动态光照环境提供实时阴影，不需要预计算。

#### 缺点
1. 过渡区域问题：不同级联之间的阴影可能在过渡区域内产生可见的不连续性，需要通过调整和优化来减轻这个问题。
2. 过远阴影可能失去细节变模糊，过近的shadow map分辨率还是不够。
3. 内存和带宽消耗：更多的级联意味着更多的阴影贴图需要被处理和存储，这可能会增加内存使用和带宽消耗。
4. 泛光和过滤问题：CSM需要仔细调整过滤方法来避免泛光（光晕）和硬边缘，特别是在低分辨率的阴影级联中。

### 远距离阴影：Distance Field Shadow Map 
#### 背景
在远处物体的阴影渲染中，传统的阴影贴图（Shadow Maps）可能会因为分辨率限制导致阴影失真或模糊。而距离场阴影映射不依赖于传统阴影贴图的分辨率，因此能够在远距离保持阴影的一致性和清晰度。此外，距离场阴影映射也支持软阴影效果，可以根据物体与光源的距离平滑地过渡阴影边缘。 

在Unreal Engine中，距离场阴影映射被用来增强静态和动态物体的远处阴影效果。由于其较高的性能和质量，这种技术尤其适合于大型开放世界游戏中，其中需要对大面积的地形和物体投射阴影。不过，它需要额外的预处理阶段来生成所需的距离场数据，这在某些情况下可能会增加资源消耗。

#### 相关工作
##### SDF
为什么用SDF？

优点1：方便做运动边界的 blending

第二行SDF只看距离为0的地方，令其为边界，不会出现第一行边界模糊的情况。

![1763058631223-5ac6a199-e49e-4ded-80c0-b979bca62351.png](./img/Ve8KnW-95sb_0-hW/1763058631223-5ac6a199-e49e-4ded-80c0-b979bca62351-079199.png)

<font style="color:rgb(38, 38, 38);">优点2：方便做任意形状的blending，无需额外考虑形状间的拓扑关系</font>

![1763058640477-10b6be3f-54ee-4fa9-b201-acea81de4211.png](./img/Ve8KnW-95sb_0-hW/1763058640477-10b6be3f-54ee-4fa9-b201-acea81de4211-028419.png)

Mainly two usages:

1. Ray marching
2. Distance field soft shadows

##### Ray marching
+ Ray marching (sphere tracing) to perform ray-SDF intersection。
    - Ray marching: 用光线追踪去追踪距离场，然后看光线会打到哪个物体表面
+ The value of SDF== a "safe" distance around
    - SDF定义了一个“安全距离”。从一点出发，只要不超过这个安全距离，就不会与任何物体发生碰撞。
    - 每次走安全距离长度的步数，然后继续根据新的安全距离做 marching。
    - Therefore, each time at p, just travel SDF(p) distance。

#### 算法流程
![1763058728109-71593328-400d-4c8d-8706-06cd8f5f4a8e.png](./img/Ve8KnW-95sb_0-hW/1763058728109-71593328-400d-4c8d-8706-06cd8f5f4a8e-247767.png)![1763058739109-acb14650-7cdf-44cc-aa2e-d0ccfc50fc52.png](./img/Ve8KnW-95sb_0-hW/1763058739109-acb14650-7cdf-44cc-aa2e-d0ccfc50fc52-906778.png)

ray marching



Use SDF to determine the (approx.) percentage of occlusion 不准的



Smaller "safe" angle <-> less visibility 安全角度越小，该着色点越暗；安全角度越大，该着色点越亮。安全角度为0时，该着色点完全处于阴影中。

#### 优点
1. Fast
    1. 方便的地与 ray marching 过程结合
    2. 忽略距离场的生成的时间，比传统 shadow map 快。考虑的话其实速度差不多。
2. High Quality
    1. 但比 PCSS 效果要差

#### 缺点
1. Need precomputation 预计算距离场
2. Need heavy storage 存储距离场
    1. 可以利用八叉树KD树等数据结构，来忽略没有物体的空间
3. Artifact



### 近距离阴影：Contact Shadow (SSAO=>HBAO、SSDO、DFAO)
#### 背景
#### **<font style="color:rgb(38, 38, 38);">核心思想</font>**
#### **<font style="color:rgb(38, 38, 38);">算法流程</font>**
![1763108124395-e86e9b33-cd10-4ab4-b47b-d00f566f399c.png](./img/Ve8KnW-95sb_0-hW/1763108124395-e86e9b33-cd10-4ab4-b47b-d00f566f399c-467575.png)

#### **<font style="color:rgb(38, 38, 38);">效果</font>**
![1763108096213-44016a96-66ad-411d-9a48-774cefeebcea.png](./img/Ve8KnW-95sb_0-hW/1763108096213-44016a96-66ad-411d-9a48-774cefeebcea-767550.jpg)

#### **<font style="color:rgb(38, 38, 38);">优点</font>**
#### **<font style="color:rgb(38, 38, 38);">缺点</font>**
#### **<font style="color:rgb(38, 38, 38);">其他相关算法</font>**
### 反射阴影：SSR（Screen Space Reflection）
#### 背景
#### 核心思想
#### 算法流程
#### 效果
![1763059536160-85f2e174-fd34-492d-bab6-7e67f22233b5.png](./img/Ve8KnW-95sb_0-hW/1763059536160-85f2e174-fd34-492d-bab6-7e67f22233b5-219285.png)

![1763059545167-0201545c-665f-4a3a-8fef-05f4f6f69511.png](./img/Ve8KnW-95sb_0-hW/1763059545167-0201545c-665f-4a3a-8fef-05f4f6f69511-147713.png)

![1763059553850-87becf95-889e-4150-914c-3bb972ade2ab.png](./img/Ve8KnW-95sb_0-hW/1763059553850-87becf95-889e-4150-914c-3bb972ade2ab-091486.png)

#### 优点
#### 缺点
![1763059565647-3eae1bbf-f958-411d-91b5-23f0cab6d0a7.png](./img/Ve8KnW-95sb_0-hW/1763059565647-3eae1bbf-f958-411d-91b5-23f0cab6d0a7-996945.png)

![1763059575134-eb6d9b2f-9230-4e25-8f98-010dc795b5a1.png](./img/Ve8KnW-95sb_0-hW/1763059575134-eb6d9b2f-9230-4e25-8f98-010dc795b5a1-474483.jpg)

### 高分辨率：Virtual Shadow Maps（VSM，虚拟阴影贴图）
#### 背景
UE5 引入

#### 核心思想
#### 算法流程
#### 效果
![1763059126788-775a4021-aafc-48c9-b334-5717b481b17f.png](./img/Ve8KnW-95sb_0-hW/1763059126788-775a4021-aafc-48c9-b334-5717b481b17f-933507.png)

![1763059115097-5ba599aa-2d31-4c7d-9d45-09a34ae7cb2b.png](./img/Ve8KnW-95sb_0-hW/1763059115097-5ba599aa-2d31-4c7d-9d45-09a34ae7cb2b-010333.jpg)

#### 优点
#### **<font style="color:rgb(38, 38, 38);">缺点</font>**
#### **<font style="color:rgb(38, 38, 38);">工程注意事项</font>**
### Ray Traced Shadow
光线追踪自然可以生成阴影

后续编程实战中会写一个最简单的 ray marching + shadow 的实现：

Unity 的 ray traced shadow 中是在屏幕空间做 ray tracing。相当于UE5中的Ray Traced Ambient Occlusion？ [https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@14.0/manual/Ray-Traced-Shadows.html](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@14.0/manual/Ray-Traced-Shadows.html)



## 在淘宝中的应用
淘宝中采用了多种阴影技术。

1. 场景介绍
    1. 光照
        1. 会布置一个环境光，偶尔也会布置点光源来强调氛围
    2. 模型
        1. GLB 模型
        2. 白底图
        3. 全景图
        4. 。。。



2. GLB 模型：
    1. 近距离阴影（自阴影）：
        1. 离线预处理：给定环境光下烘焙  或 图生3D天然产生 出带自阴影的问题。通过可微渲染将 Vray材质转化为Web 3D引擎可用的PBR-材质，确保离线和实施渲染的效果一致性。
        2. 实时：根据布置的环境光和点光源，做PBR渲染，实时计算
    2. 中距离阴影（地面投影）
        1. 之前用 shadow map，再类似王者荣耀做下透明度渐变
        2. 现在用 PCSS

![1763093450467-fcc6f383-53cf-4507-82c3-576777850b60.png](./img/Ve8KnW-95sb_0-hW/1763093450467-fcc6f383-53cf-4507-82c3-576777850b60-188031.png)

3. 白底图billboard：
    1. 近距离阴影：
        1. 不考虑
    2. 中距离阴影（地面投影）
        1. 参考photoshop的方案，类似平面阴影，但是是在shader里做
        2. 此外，一些商家上传的可能是斜着看的视图，家具底面非水平。此时需要通过图像算法获取到 家具底边的倾斜角度，然后在shader里进行平面阴影计算

![1763108272182-3162e629-01f4-4e8f-accb-a4da8f15dcbd.png](./img/Ve8KnW-95sb_0-hW/1763108272182-3162e629-01f4-4e8f-accb-a4da8f15dcbd-693614.png)![1763108262637-2ab9e280-2f14-4693-8a2f-0c96633827c7.png](./img/Ve8KnW-95sb_0-hW/1763108262637-2ab9e280-2f14-4693-8a2f-0c96633827c7-075877.png)

4. 全景图层
    1. 近距离阴影（自阴影）：烘焙。-
    2. 中距离阴影：烘焙。将物体放在全透明房间里做烘焙，渲染全景图。

![1763108334999-552d6e1a-0bb5-43e0-82ea-80e1bdad1388.png](./img/Ve8KnW-95sb_0-hW/1763108334999-552d6e1a-0bb5-43e0-82ea-80e1bdad1388-822208.png)

5. 。。。。



出于性能考虑，大都不考虑物体之间的遮挡问题。

最后，为了确保照片级渲染质量，产品支持点击进行快速的离线渲染。5s内就可以出现一张极其真实的、考虑到遮挡关系、光照、材质等所有因素的效果图

![1763093424574-514481d6-8b93-4c8f-a199-2432a1bba630.png](./img/Ve8KnW-95sb_0-hW/1763093424574-514481d6-8b93-4c8f-a199-2432a1bba630-352263.png)![1763093415528-9532134a-e603-4906-9a04-dc9c2e869758.png](./img/Ve8KnW-95sb_0-hW/1763093415528-9532134a-e603-4906-9a04-dc9c2e869758-418269.png)

## 编程实战 - Shadowmap
<font style="color:rgb(38, 38, 38);">源码：</font>[<font style="color:rgb(17, 124, 238);">web3d-demos/src/app/gallery/(demos)/shadow-mapping/render.ts at main · VirusPC/web3d-demos</font>](https://github.com/VirusPC/web3d-demos/blob/main/src/app/gallery/(demos)/shadow-mapping/render.ts)

<font style="color:rgb(38, 38, 38);">在线网址：</font>[<font style="color:rgb(22, 119, 255);">https://web3d-demos.vercel.app/gallery/shadow-mapping</font>](https://web3d-demos.vercel.app/gallery/shadow-mapping)

<font style="color:rgb(22, 119, 255);"></font>

Pass 1，从光源处渲染场景，得到 shadow map。

![1763059441014-396d10f7-ecdc-425a-98ad-a17bd80c0f39.png](./img/Ve8KnW-95sb_0-hW/1763059441014-396d10f7-ecdc-425a-98ad-a17bd80c0f39-384849.png)

![1763059447809-44b1861c-5ff8-4aa6-a474-2ba4d04b2d4d.png](./img/Ve8KnW-95sb_0-hW/1763059447809-44b1861c-5ff8-4aa6-a474-2ba4d04b2d4d-924421.png)

2. <font style="color:rgb(38, 38, 38);">Pass 2: 结合 shadow map（</font><font style="color:rgb(38, 38, 38);background-color:rgba(0, 0, 0, 0.06);">u_projectedTexture</font><font style="color:rgb(38, 38, 38);">）渲染场景</font>
    1. <font style="color:rgb(38, 38, 38);">深度图对蓝色距离</font>
    2. <font style="color:rgb(38, 38, 38);background-color:rgba(0, 0, 0, 0.06);">u_projectedTexture</font><font style="color:rgb(38, 38, 38);">的z对应红色距离，(x, y)用于定位深度图的像素</font>

![1763059484960-8b28c263-aa5a-47ea-8371-66a6cfc8f45d.png](./img/Ve8KnW-95sb_0-hW/1763059484960-8b28c263-aa5a-47ea-8371-66a6cfc8f45d-465742.png)

![1763059492577-64b0c603-cb04-43b2-a7c7-b35c8820d5da.png](./img/Ve8KnW-95sb_0-hW/1763059492577-64b0c603-cb04-43b2-a7c7-b35c8820d5da-619415.png)

![1763059504511-a48b281c-b8ea-4bb6-8e33-ad4f245ae262.png](./img/Ve8KnW-95sb_0-hW/1763059504511-a48b281c-b8ea-4bb6-8e33-ad4f245ae262-551459.jpg)

## 总结
为了在有限的时间和资源内计算出相对准确的光和影，几十年来无数科学家和工程师们前仆后继地做出了大量工作，这里只是列了大量工作中的一小部分：

1. 静态阴影、阴影动画是最简单的形式，简单且性能和平台兼容性最好，适合简单的小应用
2. 通过预先烘焙阴影信息，可以降低实时渲染压力
3. 平面阴影低端机友好，简单性能高，适合在平面地面上用
4. 阴影体不常用，但在一些不需要太多投影对象的场景，投影距离较近或者硬阴影时Shadow Volume会比 Shadow Map 更合适。
5. Shadow Map 是实时渲染中常用的一种思想
6. VSM 解决了大分辨率 Shadow Map 的存储问题
7. CSM 一般用于中远距离，解决 Shadow Map 走样问题
8. DFSM 可以用于远景，解决远处的采样，适合大范围开放场景。
9. Contact Shadow 一般用于近景，解决近景 shadow map分辨率不足的问题
10. PCSS、VSM、MSM 可以用于绘制软阴影
11. 实际开发中，往往会同时应用各种全局光照和阴影方法

## 相关文章
<font style="color:rgb(38, 38, 38);">Games 101、Games 202、Games 104 系列各个算法的相关论文：</font>

1. [<font style="color:rgb(17, 124, 238);">Apple Visionpro 怎样才能设计出避免视觉疲劳的界面设计？避免视疲劳的秘密方案_哔哩哔哩_bilibili</font>](https://www.bilibili.com/video/BV1gy421Y7on/?spm_id_from=333.999.0.0&vd_source=a637826c55b409b420b4b6584a6e8379)
2. [<font style="color:rgb(17, 124, 238);">Game Engine Architecture</font>](https://www.gameenginebook.com/)
3. [<font style="color:rgb(17, 124, 238);">GPU Gems 3 Part II: Light and Shadows</font>](https://developer.nvidia.com/gpugems/gpugems3/part-ii-light-and-shadows)
4. [<font style="color:rgb(17, 124, 238);">无标题</font>](https://developer.download.nvidia.com/assets/events/GDC15/hybrid_ray_traced_GDC_2015.pdf)
5. [<font style="color:rgb(17, 124, 238);">Cascaded Shadow Maps - NVIDIA</font>](https://developer.download.nvidia.com/SDK/10.5/opengl/src/cascaded_shadow_maps/doc/cascaded_shadow_maps.pdf)
6. [<font style="color:rgb(17, 124, 238);">WebGL2 Shadows</font>](https://webgl2fundamentals.org/webgl/lessons/webgl-shadows.html)
7. [<font style="color:rgb(17, 124, 238);">LearnOpenGL - Shadow Mapping</font>](https://learnopengl.com/Advanced-Lighting/Shadows/Shadow-Mapping)
8. [<font style="color:rgb(17, 124, 238);">Ureal Engine 5.3 - Shadowing</font>](https://docs.unrealengine.com/5.3/en-US/shadowing-in-unreal-engine/)
9. [<font style="color:rgb(17, 124, 238);">Unity - Manual: Shadows</font>](https://docs.unity3d.com/2023.3/Documentation/Manual/Shadows.html)
10. [<font style="color:rgb(17, 124, 238);">Unity - Manual: Shadow troubleshooting</font>](https://docs.unity3d.com/2021.3/Documentation/Manual/ShadowPerformance.html)
11. [<font style="color:rgb(17, 124, 238);">Ray-traced shadows | High Definition RP | 14.0.10</font>](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@14.0/manual/Ray-Traced-Shadows.html)
12. [<font style="color:rgb(17, 124, 238);">Just a moment...</font>](https://www.researchgate.net/publication/238248138_Improving_Shadows_and_Reflections_via_the_Stencil_Buffe)
13. [<font style="color:rgb(17, 124, 238);">Shadow Volumes</font>](http://www.sonic.net/~surdules/articles/cg_shadowvolumes/index.html)
14. [<font style="color:rgb(17, 124, 238);">无标题</font>](https://web3d-demos.vercel.app/gallery/shadow-mapping)
15. [<font style="color:rgb(17, 124, 238);">web3d-demos/src/app/gallery/(demos)/shadow-mapping/render.ts at main · VirusPC/web3d-demos</font>](https://github.com/VirusPC/web3d-demos/blob/main/src/app/gallery/(demos)/shadow-mapping/render.ts)
16. [<font style="color:rgb(17, 124, 238);">无标题</font>](https://github.com/VirusPC/web3d-demos/blob/main/src/app/gallery/(demos)/ray-marching/render.ts)
17. [<font style="color:rgb(17, 124, 238);">Shadow Acne</font>](https://digitalrune.github.io/DigitalRune-Documentation/html/3f4d959e-9c98-4a97-8d85-7a73c26145d7.htm)
18. [<font style="color:rgb(22, 119, 255);">全局光照、光线追踪出现之前，游戏是如何模拟出诸如投影，反射等特效的? - 知乎</font>](https://www.zhihu.com/question/379662028/answer/1083590729)
19. [<font style="color:rgb(17, 124, 238);">Shadow Volumes技术没有成为主流的原因是什么？ - 知乎</font>](https://www.zhihu.com/question/412479769)
20. [<font style="color:rgb(17, 124, 238);">UE4中的光与影 —— Lights & Shadows in UE4（第二章）</font>](https://zhuanlan.zhihu.com/p/365645774)
21. [<font style="color:rgb(17, 124, 238);">游戏中的阴影（一）：基础</font>](https://zhuanlan.zhihu.com/p/27572129)
22. [<font style="color:rgb(17, 124, 238);">Shader学习（22）基于模型的阴影技术（平面投影Planar Shadows和阴影锥Shadow Volume）</font>](https://zhuanlan.zhihu.com/p/548292793?utm_id=0)
23. [<font style="color:rgb(17, 124, 238);">UE5 Virtual Shadow Map之SMRT算法</font>](https://zhuanlan.zhihu.com/p/609983515)
24. [<font style="color:rgb(17, 124, 238);">（官方转载）UE5 虚拟阴影贴图 （VirtualShadowMaps）的优势和局限性</font>](https://zhuanlan.zhihu.com/p/407945117?utm_id=0)

  




> 更新: 2025-11-14 08:31:38  
> 原文: <https://www.yuque.com/viruspc/el3mi0/yxrafdcwlx3d8nxi>