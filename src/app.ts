import {vec3,mat4} from 'gl-matrix'
import { CubeData } from './cubeData'
import {shaders} from './triangle'
import {CubeDataGene} from './gene_list'
import * as fs from 'fs';
//const fs = require('fs'); 
//import fs from 'fs-extra';
//import * as Deno from 'deno';


function pixelsToCanvas(pixels, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  imgData.data.set(pixels);
  ctx.putImageData(imgData, 0, 1);

  // flip the image
  ctx.scale(1, -1);
  ctx.globalCompositeOperation = 'copy';
  ctx.drawImage(canvas, 0, -height, width, height);

  return canvas;
}

(async() => {
  var adapter = await navigator.gpu.requestAdapter();
  var device = await adapter.requestDevice();

  var canvas = document.getElementById("webgpu-canvas") as HTMLCanvasElement;
  var context = canvas.getContext("webgpu");

  var square = CubeDataGene().square;
  var cubeBuff = device.createBuffer({
    size: square.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true 
  });

  new Float32Array(cubeBuff.getMappedRange()).set(square);
  cubeBuff.unmap();

  var depthTexture = device.createTexture({
    size: {width: canvas.width, height: canvas.height},
    format: "depth24plus-stencil8",
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  });

  context.configure(
    {device: device, format: "bgra8unorm", usage: GPUTextureUsage.RENDER_ATTACHMENT});
  
    var sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
      mipmapFilter: 'nearest',
      maxAnisotropy: 1
    } as GPUSamplerDescriptor);
  var width, height;
  let cubeTexture: GPUTexture;
    {
      const img = document.createElement('img');
      const response: Response = await fetch('dog.webp');
      const blob: Blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);
      width = imageBitmap.width;
      height = imageBitmap.height;
  
      console.log('image: '+imageBitmap.height+" "+imageBitmap.width);
      console.log('canvas'+canvas.height+" "+canvas.width);
  
      cubeTexture = device.createTexture({
        size: [imageBitmap.width, imageBitmap.height, 1],
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      console.log('dimension'+cubeTexture.width);
      // console.log(zeroimg.length);
      // var image = pixelsToCanvas(zeroimg, width, height);
      // console.log('blob'+blob.size);
      device.queue.copyExternalImageToTexture(
        { source: imageBitmap },
        { texture: cubeTexture },
        [imageBitmap.width, imageBitmap.height]
      );
    }
  
    var bindingGroupLayout = device.createBindGroupLayout({
      entries:[{
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {}
      } as GPUBindGroupLayoutEntry,{
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture:{}
      } as GPUBindGroupLayoutEntry]
    });
  
    var uniformBindGroup = device.createBindGroup({
      layout: bindingGroupLayout,
      entries: [
        {
          binding: 0,
          resource: sampler
        },
        {
          binding: 1,
          resource: cubeTexture.createView()
        }
      ]
    });
  
  var computeBindGroupLayouts = device.createBindGroupLayout({
    label: 'Compute Binding Group Layout',
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    },{
      binding: 1,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    },{
      binding: 2,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    },{
      binding: 3,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {type: 'storage'}
    }]
  })

  var zeroimg = new Float32Array(128*128);
  var texBuff = device.createBuffer({
    label: 'textbuff buffer',
    size: zeroimg.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
  });

  var x = CubeDataGene().x;
  var y = CubeDataGene().y;
  var weight = CubeDataGene().weight;

  var xBuff = device.createBuffer({
    label: 'x buffer',
    size: x.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
  });

  var yBuff = device.createBuffer({
    label: 'y buffer',
    size: y.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
  });

  var weightBuff = device.createBuffer({
    label: 'textbuff buffer',
    size: weight.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.STORAGE,
  });

  var resultBuff = device.createBuffer({
    label: 'result buffer',
    size: zeroimg.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(texBuff, 0, zeroimg);
  device.queue.writeBuffer(xBuff,0,x);
  device.queue.writeBuffer(yBuff,0,y);
  device.queue.writeBuffer(weightBuff,0,weight);

  var computeUniformBindGroup = device.createBindGroup({
    label: 'Compute Binding Group',
    layout: computeBindGroupLayouts,
    entries: [{
      binding: 0,
      resource: {buffer: texBuff}
    },{
      binding: 1,
      resource: {buffer: xBuff}
    },{
      binding: 2,
      resource: {buffer: yBuff}
    },{
      binding: 3,
      resource: {buffer: weightBuff}
    }]
  })
  
  var computePipeline = device.createComputePipeline({
    label: 'Compute Pipeline',
    layout: device.createPipelineLayout({bindGroupLayouts: [computeBindGroupLayouts]}),
    compute: {
      module: device.createShaderModule({code: shaders().compute}),
      entryPoint: 'main'
    }
  })
  
  var renderPipeline = device.createRenderPipeline({
    layout : device.createPipelineLayout({bindGroupLayouts: [bindingGroupLayout]}),
    vertex: {
      module: device.createShaderModule({code: shaders().vertex}),
      entryPoint: 'main',
      buffers: [{
        arrayStride: 6*4,
        attributes:[
          {format: 'float32x4', offset:0, shaderLocation: 0},
          {format: 'float32x2', offset:16, shaderLocation: 1}]
      }]
    } as GPUVertexState,
    fragment:{
      module: device.createShaderModule({code: shaders().fragment}),
      entryPoint: 'main',
      targets: [{format: 'bgra8unorm'}]
    } as GPUFragmentState,
    depthStencil: {format: "depth24plus-stencil8", depthWriteEnabled: true, depthCompare: "less"},
    primitive:{topology:"triangle-strip"},
  });

  var renderPassDesc = {
    colorAttachments: [{    
        view: undefined,
        loadOp: "clear",
        clearValue: [0.5, 0.5, 0.5, 1],
        storeOp: "store"
    }],
    depthStencilAttachment: {
        view: depthTexture.createView(),
        depthLoadOp: "clear",
        depthClearValue: 1.0,
        depthStoreOp: "store",
        stencilLoadOp: "clear",
        stencilClearValue: 0,
        stencilStoreOp: "store"
    }
} as GPURenderPassDescriptor;


var animationFrame = function() {
  var resolve = null;
  var promise = new Promise(r => resolve = r);
  window.requestAnimationFrame(resolve);
  return promise
};
requestAnimationFrame(animationFrame);

const encoder = device.createCommandEncoder({
  label: 'doubling encoder',
});
const pass = encoder.beginComputePass({
  label: 'doubling compute pass',
});
pass.setPipeline(computePipeline);
pass.setBindGroup(0, computeUniformBindGroup);
pass.dispatchWorkgroups(zeroimg.length);
pass.end();

encoder.copyBufferToBuffer(texBuff,0,resultBuff, 0, resultBuff.size);
device.queue.submit([encoder.finish()]);

await resultBuff.mapAsync(GPUMapMode.READ);
const result = new Float32Array(resultBuff.getMappedRange().slice(0,resultBuff.size));
resultBuff.unmap();
console.log('result'+result);


const file = new Blob([result.toString()], {type: 'text/plain;charset=utf-8'});
const url = URL.createObjectURL(file);
const link = document.createElement('a');
link.href = url;
link.download = 'filename.txt';
document.body.appendChild(link);
link.click();
//console.log('input'+zeroimg)
console.log('output'+result[result.length-1]);

// while(true){
//   await animationFrame();

//   renderPassDesc.colorAttachments[0].view = context.getCurrentTexture().createView();
//   var commandEncoder = device.createCommandEncoder();
//   var renderPass = commandEncoder.beginRenderPass(renderPassDesc);

//   renderPass.setPipeline(renderPipeline);
//   renderPass.setVertexBuffer(0,cubeBuff);
//   renderPass.setBindGroup(0,uniformBindGroup);

//   // var zeroimg = new Float32Array(height*width);
//   //     for(var i=0;i<zeroimg.length;i++){
//   //       zeroimg[i]=0.5;
//   //     }
//   //     console.log(zeroimg.length);
//   //     var image = pixelsToCanvas(zeroimg, width, height);
//   //     device.queue.copyExternalImageToTexture(
//   //       { source: image },
//   //       { texture: cubeTexture },
//   //       [width, height]
//   //     );
//   renderPass.draw(6);
//   renderPass.end();
//   device.queue.submit([commandEncoder.finish()]);
// }

})();