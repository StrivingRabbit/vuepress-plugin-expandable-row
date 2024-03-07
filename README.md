# vuepress-plugin-expandable-row

## Introduction

表格行展开插件

### Use

  md 书写格式
  ```md
  |父Table第一列|父Table第二列				|父Table第三列|
  |:------		|:-------					|:--------|
  |A		|B					|C|
  |D		|E|[HBuilderX](https://www.dcloud.io/hbuilderx.html)|
  @|第一列|第二列				|第三列				|
  @|:------		|:-------:	|-------:	|
  @|第一行		|**居中**|~~markdown~~|
  @@|第一列|第二列				|第三列				|
  @@|:------		|:-------:	|-------:	|
  @@|第一行		|[HBuilderX](https://www.dcloud.io/hbuilderx.html)|换行<br/>操作|
  @@@|第一列|第二列				|第三列				|
  @@@|:------		|:-------:	|-------:	|
  @@@|第一行		|[HBuilderX](https://www.dcloud.io/hbuilderx.html)|换行<br/>操作|
  @|第二行		|[HBuilderX](https://www.dcloud.io/hbuilderx.html)|右对齐|
  |Q	|W	|E|
  @|第一列|第二列				|
  @|:------		|:-------	|
  @|第一列内容		|[HBuilderX](https://www.dcloud.io/hbuilderx.html)|
  |X	|Y					|Z|
  ```
  表现为：

  ![](https://web-ext-storage.dcloud.net.cn/doc/expandable-row.png)
