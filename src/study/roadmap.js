// A curated DSA roadmap: twelve core patterns, each with a short guide and a
// hand-picked problem list (most are from the well-known Blind 75 / NeetCode sets).

export const leetcodeUrl = (slug) => `https://leetcode.com/problems/${slug}/`;

const P = (name, difficulty, slug) => ({ name, difficulty, slug });

export const ROADMAP = [
  {
    id: "arrays-hashing",
    title: "Arrays & Hashing",
    tagline: "Trade memory for speed: a hash map turns repeated searching into a single lookup.",
    recognize: [
      "You need to find, count, or group items by value",
      "A brute-force pair or duplicate search is O(n²)",
      "Order doesn't matter, or you can sort first",
    ],
    approach: [
      "Store what you've seen (value to index, or value to count) in a map or set",
      "Check the map before inserting the current element",
      "For grouping, build a canonical key such as sorted letters or a count tuple",
    ],
    template: `const seen = new Map();
for (let i = 0; i < nums.length; i++) {
  const need = target - nums[i];
  if (seen.has(need)) return [seen.get(need), i];
  seen.set(nums[i], i);
}`,
    complexity: "Usually O(n) time, O(n) space",
    problems: [
      P("Two Sum", "Easy", "two-sum"),
      P("Contains Duplicate", "Easy", "contains-duplicate"),
      P("Valid Anagram", "Easy", "valid-anagram"),
      P("Group Anagrams", "Medium", "group-anagrams"),
      P("Top K Frequent Elements", "Medium", "top-k-frequent-elements"),
      P("Product of Array Except Self", "Medium", "product-of-array-except-self"),
      P("Longest Consecutive Sequence", "Medium", "longest-consecutive-sequence"),
    ],
  },
  {
    id: "two-pointers",
    title: "Two Pointers",
    tagline: "Two indices walking through sorted or symmetric data replace a nested loop.",
    recognize: [
      "Sorted array, or a string you compare from both ends",
      "Finding pairs or triplets that hit a target sum",
      "In-place removal or partitioning",
    ],
    approach: [
      "Start pointers at both ends (or both at the start)",
      "Move the pointer that can improve the answer, based on a comparison",
      "Stop when the pointers meet or cross",
    ],
    template: `let l = 0, r = nums.length - 1;
while (l < r) {
  const sum = nums[l] + nums[r];
  if (sum === target) return [l, r];
  if (sum < target) l++;
  else r--;
}`,
    complexity: "O(n) time after sorting, O(1) extra space",
    problems: [
      P("Valid Palindrome", "Easy", "valid-palindrome"),
      P("Two Sum II - Input Array Is Sorted", "Medium", "two-sum-ii-input-array-is-sorted"),
      P("3Sum", "Medium", "3sum"),
      P("Container With Most Water", "Medium", "container-with-most-water"),
      P("Trapping Rain Water", "Hard", "trapping-rain-water"),
    ],
  },
  {
    id: "sliding-window",
    title: "Sliding Window",
    tagline: "Keep a window over a contiguous range and update it in O(1) as it slides.",
    recognize: [
      "Longest, shortest, or best contiguous subarray or substring",
      "A rule you can check incrementally (distinct characters, sum at most k)",
      "Brute force keeps re-scanning the same elements",
    ],
    approach: [
      "Grow the window by moving the right edge",
      "While the window breaks the rule, shrink it from the left",
      "Record the best answer after each valid window",
    ],
    template: `let l = 0, best = 0;
const count = new Map();
for (let r = 0; r < s.length; r++) {
  count.set(s[r], (count.get(s[r]) || 0) + 1);
  while (count.get(s[r]) > 1) { // the window has a repeat, so shrink it
    count.set(s[l], count.get(s[l]) - 1);
    l++;
  }
  best = Math.max(best, r - l + 1);
}
return best;`,
    complexity: "O(n) time, since each index enters and leaves the window once",
    problems: [
      P("Best Time to Buy and Sell Stock", "Easy", "best-time-to-buy-and-sell-stock"),
      P("Longest Substring Without Repeating Characters", "Medium", "longest-substring-without-repeating-characters"),
      P("Longest Repeating Character Replacement", "Medium", "longest-repeating-character-replacement"),
      P("Permutation in String", "Medium", "permutation-in-string"),
      P("Minimum Window Substring", "Hard", "minimum-window-substring"),
    ],
  },
  {
    id: "stack",
    title: "Stack",
    tagline: "Last in, first out: ideal for matching pairs and 'next greater' questions.",
    recognize: [
      "Nested or matching structure (brackets, tags)",
      "For each element, find the next greater or smaller one",
      "Most-recent-first processing or undo-style behavior",
    ],
    approach: [
      "Push items that are still waiting for an answer",
      "When the current item resolves the top, pop it and record the result",
      "A monotonic stack stays sorted, which makes each step O(1) amortized",
    ],
    template: `const stack = []; // indices still waiting for a warmer day
const answer = new Array(temps.length).fill(0);
for (let i = 0; i < temps.length; i++) {
  while (stack.length && temps[i] > temps[stack[stack.length - 1]]) {
    const j = stack.pop();
    answer[j] = i - j;
  }
  stack.push(i);
}
return answer;`,
    complexity: "O(n) time, O(n) space",
    problems: [
      P("Valid Parentheses", "Easy", "valid-parentheses"),
      P("Min Stack", "Medium", "min-stack"),
      P("Evaluate Reverse Polish Notation", "Medium", "evaluate-reverse-polish-notation"),
      P("Daily Temperatures", "Medium", "daily-temperatures"),
      P("Largest Rectangle in Histogram", "Hard", "largest-rectangle-in-histogram"),
    ],
  },
  {
    id: "binary-search",
    title: "Binary Search",
    tagline: "Halve the search space each step, on arrays or on the answer itself.",
    recognize: [
      "Sorted or rotated-sorted input",
      "You can test 'is this answer big enough?' with a yes/no check",
      "A required O(log n) runtime",
    ],
    approach: [
      "Keep lo and hi as the range that can still contain the answer",
      "Compare the middle and discard the half that cannot contain it",
      "For 'smallest value that works', binary search the answer and write a feasibility check",
    ],
    template: `let lo = 0, hi = nums.length - 1;
while (lo <= hi) {
  const mid = lo + Math.floor((hi - lo) / 2);
  if (nums[mid] === target) return mid;
  if (nums[mid] < target) lo = mid + 1;
  else hi = mid - 1;
}
return -1;`,
    complexity: "O(log n) time, O(1) space",
    problems: [
      P("Binary Search", "Easy", "binary-search"),
      P("Search a 2D Matrix", "Medium", "search-a-2d-matrix"),
      P("Koko Eating Bananas", "Medium", "koko-eating-bananas"),
      P("Find Minimum in Rotated Sorted Array", "Medium", "find-minimum-in-rotated-sorted-array"),
      P("Search in Rotated Sorted Array", "Medium", "search-in-rotated-sorted-array"),
      P("Median of Two Sorted Arrays", "Hard", "median-of-two-sorted-arrays"),
    ],
  },
  {
    id: "linked-list",
    title: "Linked List",
    tagline: "Pointer manipulation: fast and slow pointers, dummy heads, and careful reversal.",
    recognize: [
      "Cycle detection, the middle node, or the nth node from the end",
      "Reversing or reordering nodes in place",
      "Merging sorted lists",
    ],
    approach: [
      "Use a dummy head so the first node isn't a special case",
      "Fast and slow pointers find cycles and midpoints",
      "When reversing, save next before you overwrite it",
    ],
    template: `let prev = null, cur = head;
while (cur) {
  const next = cur.next;
  cur.next = prev;
  prev = cur;
  cur = next;
}
return prev;`,
    complexity: "O(n) time, O(1) extra space for most in-place problems",
    problems: [
      P("Reverse Linked List", "Easy", "reverse-linked-list"),
      P("Merge Two Sorted Lists", "Easy", "merge-two-sorted-lists"),
      P("Linked List Cycle", "Easy", "linked-list-cycle"),
      P("Reorder List", "Medium", "reorder-list"),
      P("Remove Nth Node From End of List", "Medium", "remove-nth-node-from-end-of-list"),
      P("LRU Cache", "Medium", "lru-cache"),
      P("Merge k Sorted Lists", "Hard", "merge-k-sorted-lists"),
    ],
  },
  {
    id: "trees",
    title: "Trees",
    tagline: "Recursion that mirrors the structure, plus BFS when levels matter.",
    recognize: [
      "Anything about depth, paths, ancestors, or subtrees",
      "A binary search tree, where the ordering is a hint",
      "Level-by-level questions",
    ],
    approach: [
      "DFS: solve the left and right subtrees, then combine at the node",
      "BFS with a queue for level order",
      "For BST problems, pass down lower and upper bounds, or use an inorder traversal",
    ],
    template: `function depth(node) {
  if (!node) return 0;
  return 1 + Math.max(depth(node.left), depth(node.right));
}`,
    complexity: "O(n) time, O(h) space for the call stack (h = tree height)",
    problems: [
      P("Invert Binary Tree", "Easy", "invert-binary-tree"),
      P("Maximum Depth of Binary Tree", "Easy", "maximum-depth-of-binary-tree"),
      P("Same Tree", "Easy", "same-tree"),
      P("Subtree of Another Tree", "Easy", "subtree-of-another-tree"),
      P("Binary Tree Level Order Traversal", "Medium", "binary-tree-level-order-traversal"),
      P("Validate Binary Search Tree", "Medium", "validate-binary-search-tree"),
      P("Kth Smallest Element in a BST", "Medium", "kth-smallest-element-in-a-bst"),
      P("Lowest Common Ancestor of a Binary Search Tree", "Medium", "lowest-common-ancestor-of-a-binary-search-tree"),
      P("Binary Tree Maximum Path Sum", "Hard", "binary-tree-maximum-path-sum"),
    ],
  },
  {
    id: "heap",
    title: "Heap / Priority Queue",
    tagline: "Always know the smallest or largest item in O(log n).",
    recognize: [
      "Top k, kth largest, or kth smallest",
      "You repeatedly need the current min or max as data changes",
      "Merging several sorted streams",
    ],
    approach: [
      "Keep a min-heap of size k to track the k largest items",
      "Pop the top whenever the heap grows past k",
      "Use two heaps (a max-heap and a min-heap) to maintain a running median",
    ],
    template: `// JavaScript has no built-in heap, so write a small MinHeap class.
const heap = new MinHeap();
for (const x of nums) {
  heap.push(x);
  if (heap.size() > k) heap.pop(); // drop the smallest
}
return heap.peek(); // kth largest`,
    complexity: "O(n log k) time, O(k) space",
    problems: [
      P("Kth Largest Element in a Stream", "Easy", "kth-largest-element-in-a-stream"),
      P("Last Stone Weight", "Easy", "last-stone-weight"),
      P("K Closest Points to Origin", "Medium", "k-closest-points-to-origin"),
      P("Kth Largest Element in an Array", "Medium", "kth-largest-element-in-an-array"),
      P("Task Scheduler", "Medium", "task-scheduler"),
      P("Find Median from Data Stream", "Hard", "find-median-from-data-stream"),
    ],
  },
  {
    id: "backtracking",
    title: "Backtracking",
    tagline: "Build a solution step by step, and undo the step when it leads nowhere.",
    recognize: [
      "Generate all subsets, permutations, or combinations",
      "Constraint puzzles such as N-Queens or word search",
      "The answer is a path of choices",
    ],
    approach: [
      "Choose: add an option to the current path",
      "Explore: recurse with the remaining options",
      "Un-choose: remove it and try the next option, pruning invalid branches early",
    ],
    template: `const result = [];
function backtrack(start, path) {
  result.push([...path]);
  for (let i = start; i < nums.length; i++) {
    path.push(nums[i]);        // choose
    backtrack(i + 1, path);    // explore
    path.pop();                // un-choose
  }
}
backtrack(0, []);
return result;`,
    complexity: "Often O(2ⁿ) or O(n!) time; pruning is what makes it practical",
    problems: [
      P("Subsets", "Medium", "subsets"),
      P("Combination Sum", "Medium", "combination-sum"),
      P("Permutations", "Medium", "permutations"),
      P("Subsets II", "Medium", "subsets-ii"),
      P("Word Search", "Medium", "word-search"),
      P("Palindrome Partitioning", "Medium", "palindrome-partitioning"),
      P("N-Queens", "Hard", "n-queens"),
    ],
  },
  {
    id: "graphs",
    title: "Graphs",
    tagline: "Model relationships as nodes and edges, then traverse with BFS or DFS.",
    recognize: [
      "Grids of land and water, rooms, or connected regions",
      "Dependencies or prerequisites (think topological sort)",
      "Shortest path in an unweighted graph (BFS)",
    ],
    approach: [
      "Build an adjacency list, or treat grid cells as nodes",
      "Track visited nodes so you never revisit one",
      "BFS gives shortest paths by edge count; DFS explores whole components; topological sort handles ordering",
    ],
    template: `function numIslands(grid) {
  let count = 0;
  const dfs = (r, c) => {
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return;
    if (grid[r][c] !== "1") return;
    grid[r][c] = "0"; // mark visited
    dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
  };
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[0].length; c++)
      if (grid[r][c] === "1") { count++; dfs(r, c); }
  return count;
}`,
    complexity: "O(V + E) time, O(V) space",
    problems: [
      P("Number of Islands", "Medium", "number-of-islands"),
      P("Clone Graph", "Medium", "clone-graph"),
      P("Max Area of Island", "Medium", "max-area-of-island"),
      P("Pacific Atlantic Water Flow", "Medium", "pacific-atlantic-water-flow"),
      P("Rotting Oranges", "Medium", "rotting-oranges"),
      P("Course Schedule", "Medium", "course-schedule"),
      P("Course Schedule II", "Medium", "course-schedule-ii"),
      P("Word Ladder", "Hard", "word-ladder"),
    ],
  },
  {
    id: "dp",
    title: "Dynamic Programming",
    tagline: "Break a problem into overlapping subproblems and remember each answer once.",
    recognize: [
      "Count the ways, or find the min or max, over a series of choices",
      "Brute-force recursion repeats the same subproblems",
      "Each decision depends only on a small state (an index, a remaining amount)",
    ],
    approach: [
      "Define dp[i] in plain words before writing any code",
      "Write the recurrence: how does dp[i] come from smaller states?",
      "Fill from the base case up (tabulation) or memoize the recursion, then shrink the state if only the last few values matter",
    ],
    template: `// dp[a] = fewest coins that make amount a
const dp = new Array(amount + 1).fill(Infinity);
dp[0] = 0;
for (let a = 1; a <= amount; a++) {
  for (const coin of coins) {
    if (coin <= a) dp[a] = Math.min(dp[a], dp[a - coin] + 1);
  }
}
return dp[amount] === Infinity ? -1 : dp[amount];`,
    complexity: "Time = (number of states) × (work per state); space is often reducible",
    problems: [
      P("Climbing Stairs", "Easy", "climbing-stairs"),
      P("House Robber", "Medium", "house-robber"),
      P("House Robber II", "Medium", "house-robber-ii"),
      P("Longest Palindromic Substring", "Medium", "longest-palindromic-substring"),
      P("Decode Ways", "Medium", "decode-ways"),
      P("Coin Change", "Medium", "coin-change"),
      P("Word Break", "Medium", "word-break"),
      P("Longest Increasing Subsequence", "Medium", "longest-increasing-subsequence"),
      P("Unique Paths", "Medium", "unique-paths"),
      P("Longest Common Subsequence", "Medium", "longest-common-subsequence"),
    ],
  },
  {
    id: "greedy-intervals",
    title: "Greedy & Intervals",
    tagline: "Make the locally best choice, and sort first so 'best' is easy to see.",
    recognize: [
      "Scheduling, merging, or covering ranges",
      "Maximize or minimize with a clear 'take it now' rule",
      "Sorting by start or end time makes the decision obvious",
    ],
    approach: [
      "Sort by the key that exposes the greedy choice (often start or end time)",
      "Sweep once, keeping the current best or the last merged interval",
      "Be able to explain why the local choice never hurts the final answer",
    ],
    template: `intervals.sort((a, b) => a[0] - b[0]);
const merged = [intervals[0]];
for (const [start, end] of intervals.slice(1)) {
  const last = merged[merged.length - 1];
  if (start <= last[1]) last[1] = Math.max(last[1], end);
  else merged.push([start, end]);
}
return merged;`,
    complexity: "O(n log n) for the sort, O(n) for the sweep",
    problems: [
      P("Maximum Subarray", "Medium", "maximum-subarray"),
      P("Jump Game", "Medium", "jump-game"),
      P("Jump Game II", "Medium", "jump-game-ii"),
      P("Gas Station", "Medium", "gas-station"),
      P("Merge Intervals", "Medium", "merge-intervals"),
      P("Insert Interval", "Medium", "insert-interval"),
      P("Non-overlapping Intervals", "Medium", "non-overlapping-intervals"),
    ],
  },
];

// The notes a topic starts with when it's created from the library, so the
// "revise notes" reviews have something worth reading.
export function topicNotesFor(group) {
  return [
    group.tagline,
    "",
    "Recognize it when:",
    ...group.recognize.map((r) => `- ${r}`),
    "",
    "Approach:",
    ...group.approach.map((a) => `- ${a}`),
    "",
    `Complexity: ${group.complexity}`,
  ].join("\n");
}
