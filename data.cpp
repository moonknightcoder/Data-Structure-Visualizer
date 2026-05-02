#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <string>

using namespace emscripten;
using namespace std;

// ===================== INT TO STRING =====================
string intToString(int num) {
    if (num == 0) {
        return "0";
    }
    string result = "";
    bool negative = false;
    if (num < 0) {
        negative = true;
        num = -num;
    }
    while (num > 0) {
        result = char('0' + (num % 10)) + result;
        num /= 10;
    }
    if (negative) {
        result = "-" + result;
    }
    return result;
}
// ===================== LINKED LIST NODE =====================
struct Node {
    int data;
    Node* next;

    Node(int data) : data(data), next(NULL) {}
};

// ===================== QUEUE =====================
class Queue {
private:
    Node* front;
    Node* rear;
    int size;

public:
    Queue() : front(NULL), rear(NULL), size(0) {}

    ~Queue() {
        while (!empty()) {
            dequeue();
        }
    }

    void enqueue(int data) {
        Node* newNode = new Node(data);
        if (rear == NULL) {
            front = rear = newNode;
        }
        else {
            rear->next = newNode;
            rear = newNode;
        }
        size++;
    }

    void dequeue() {
        if (empty())
            return;
        Node* temp = front;
        front = front->next;
        if (front == NULL) {
            rear = NULL;
        }
        delete temp;
        size--;
    }

    int Front() {
        if (empty()) 
            return -1;
        return front->data;
    }

    bool empty() {
        return size == 0;
    }
};

// ===================== STACK =====================
class Stack {
private:
    Node* top;
    int size;

public:
    Stack() : top(NULL), size(0) {}

    ~Stack() {
        while (!empty()) {
            pop();
        }
    }

    void push(int data) {
        Node* newNode = new Node(data);
        newNode->next = top;
        top = newNode;
        size++;
    }

    void pop() {
        if (empty()) 
            return;
        Node* temp = top;
        top = top->next;
        delete temp;
        size--;
    }

    int Top() {
        if (empty()) 
            return -1;
        return top->data;
    }

    bool empty() {
        return size == 0;
    }
};

// ===================== MIN HEAP (FOR PRIM/DIJKSTRA) =====================
struct PQNode {
    int vertex;
    int key;
};

class MinHeap {
private:
    PQNode* heap;
    int size;
    int capacity;

    void swap(PQNode& a, PQNode& b) {
        PQNode temp = a;
        a = b;
        b = temp;
    }

    void heapifyUp(int i) {
        while (i > 1 && heap[i].key < heap[i / 2].key) {
            swap(heap[i], heap[i / 2]);
            i = i / 2;
        }
    }

    void heapifyDown(int i) {
        int smallest = i;
        int left = 2 * i;
        int right = 2 * i + 1;

        if (left <= size && heap[left].key < heap[smallest].key)
            smallest = left;
        if (right <= size && heap[right].key < heap[smallest].key)
            smallest = right;

        if (smallest != i) {
            swap(heap[i], heap[smallest]);
            heapifyDown(smallest);
        }
    }

public:
    MinHeap(int cap) : size(0), capacity(cap) {
        heap = new PQNode[capacity + 1];
    }

    ~MinHeap() {
        delete[] heap;
    }

    void push(int vertex, int key) {
        if (size >= capacity) return;
        size++;
        heap[size].vertex = vertex;
        heap[size].key = key;
        heapifyUp(size);
    }

    PQNode pop() {
        if (size == 0) return { -1, 999999 };
        PQNode top = heap[1];
        heap[1] = heap[size];
        size--;
        if (size > 0) heapifyDown(1);
        return top;
    }

    bool empty() {
        return size == 0;
    }
};

// ===================== 1. BINARY HEAP =====================
class BinaryHeap {
private:
    int* arr;
    int size;
    int cap;
    bool isMin;

    void swap(int& a, int& b) {
        int t = a;
        a = b;
        b = t;
    }

    void heapifyUp(int i) {
        while (i > 1) {
            int parent = i / 2;
            if (isMin && arr[parent] > arr[i]) {
                swap(arr[i], arr[parent]);
                i = parent;
            }
            else if (!isMin && arr[parent] < arr[i]) {
                swap(arr[i], arr[parent]);
                i = parent;
            }
            else {
                break;
            }
        }
    }

    void heapifyDown(int i) {
        int target = i;
        int left = 2 * i;
        int right = 2 * i + 1;

        if (left <= size) {
            if (isMin && arr[left] < arr[target])
                target = left;
            else if (!isMin && arr[left] > arr[target])
                target = left;
        }

        if (right <= size) {
            if (isMin && arr[right] < arr[target])
                target = right;
            else if (!isMin && arr[right] > arr[target])
                target = right;
        }

        if (target != i) {
            swap(arr[i], arr[target]);
            heapifyDown(target);
        }
    }

    void buildHeap() {
        for (int i = size / 2; i >= 1; i--) {
            heapifyDown(i);
        }
    }

public:
    BinaryHeap(bool minHeap = true) : size(0), cap(100), isMin(minHeap) {
        arr = new int[cap + 1];
    }

    ~BinaryHeap() {
        delete[] arr;
    }

    void insert(int val) {
        if (size == cap) 
            return;
        size++;
        arr[size] = val;
        heapifyUp(size);
    }

    int extractTop() {
        if (size == 0) 
            return -999999;
        int root = arr[1];
        arr[1] = arr[size];
        size--;
        if (size > 0) heapifyDown(1);
        return root;
    }

    void convertToMinHeap() {
        isMin = true;
        buildHeap();
    }

    void convertToMaxHeap() {
        isMin = false;
        buildHeap();
    }

    bool getIsMinHeap() {
        return isMin;
    }

    string getArray() {
        string result = "[";
        for (int i = 1; i <= size; i++) {
            result += intToString(arr[i]);
            if (i < size) 
                result += ",";
        }
        result += "]";
        return result;
    }

    void clear() {
        size = 0;
    }
};

// ===================== 2. AVL TREE =====================
class AVL {
private:
    struct Node {
        int key;
        int height;
        Node* left;
        Node* right;

        Node(int k) {
            key = k;
            height = 1;
            left = right = 0;
            right = 0;
        }
    };

    Node* root;

    // own max function
    int max(int a, int b) {
        return (a > b) ? a : b;
    }

    int height(Node* n) {
        return (n == 0) ? 0 : n->height;
    }

    int getBalance(Node* n) {
        if (n == 0) return 0;
        return height(n->left) - height(n->right);
    }

    // Right rotation (LL)
    Node* rightRotate(Node* y) {
        Node* x = y->left;
        Node* T2 = x->right;

        x->right = y;
        y->left = T2;

        y->height = 1 + max(height(y->left), height(y->right));
        x->height = 1 + max(height(x->left), height(x->right));

        return x;
    }

    // Left rotation (RR)
    Node* leftRotate(Node* x) {
        Node* y = x->right;
        Node* T2 = y->left;

        y->left = x;
        x->right = T2;

        x->height = 1 + max(height(x->left), height(x->right));
        y->height = 1 + max(height(y->left), height(y->right));

        return y;
    }

    // Insert helper
    Node* insert(Node* node, int key) {
        if (node == 0)
            return new Node(key);

        if (key < node->key)
            node->left = insert(node->left, key);
        else if (key > node->key)
            node->right = insert(node->right, key);
        else
            return node; // duplicates not allowed

        node->height = 1 + max(height(node->left), height(node->right));
        int balance = getBalance(node);

        // LL
        if (balance > 1 && key < node->left->key)
            return rightRotate(node);

        // RR
        if (balance < -1 && key > node->right->key)
            return leftRotate(node);

        // LR
        if (balance > 1 && key > node->left->key) {
            node->left = leftRotate(node->left);
            return rightRotate(node);
        }

        // RL
        if (balance < -1 && key < node->right->key) {
            node->right = rightRotate(node->right);
            return leftRotate(node);
        }

        return node;
    }

    // min value node
    Node* minValueNode(Node* node) {
        Node* cur = node;
        while (cur->left != 0)
            cur = cur->left;
        return cur;
    }

    // Delete helper
    Node* remove(Node* root, int key) {
        if (root == 0) return root;

        if (key < root->key)
            root->left = remove(root->left, key);
        else if (key > root->key)
            root->right = remove(root->right, key);
        else {
            if (root->left == 0 || root->right == 0) {
                Node* temp = root->left ? root->left : root->right;

                if (temp == 0) {
                    temp = root;
                    root = 0;
                } else {
                    root->key = temp->key;
                    root->left = temp->left;
                    root->right = temp->right;
                    root->height = temp->height;
                }
                delete temp;
            }
            else {
                Node* temp = minValueNode(root->right);
                root->key = temp->key;
                root->right = remove(root->right, temp->key);
            }
        }

        if (root == 0)
            return root;

        root->height = 1 + max(height(root->left), height(root->right));
        int balance = getBalance(root);

        // LL
        if (balance > 1 && getBalance(root->left) >= 0)
            return rightRotate(root);

        // LR
        if (balance > 1 && getBalance(root->left) < 0) {
            root->left = leftRotate(root->left);
            return rightRotate(root);
        }

        // RR
        if (balance < -1 && getBalance(root->right) <= 0)
            return leftRotate(root);

        // RL
        if (balance < -1 && getBalance(root->right) > 0) {
            root->right = rightRotate(root->right);
            return leftRotate(root);
        }

        return root;
    }

    // Inorder printing (you can replace with your own print)
    void inorder(Node* n) {
        if (n == 0) return;
        inorder(n->left);
        // replace this with your own print function
        print(n->key);
        inorder(n->right);
    }

    // Dummy print that you can replace
    void print(int x) {
        // your own logic or use printf
    }

public:
    AVL() { root = 0; }

    void insert(int key) {
        root = insert(root, key);
    }

    void remove(int key) {
        root = remove(root, key);
    }

    void inorder() {
        inorder(root);
    }
};

// ===================== 3. GRAPH (ADJACENCY MATRIX) =====================
class Graph {
private:
    int n;
    int** adjMatrix;
    bool isDirected;

public:
    Graph(int vertices, bool directed = false) : n(vertices), isDirected(directed) {
        adjMatrix = new int* [n];
        for (int i = 0; i < n; i++) {
            adjMatrix[i] = new int[n];
            for (int j = 0; j < n; j++) {
                adjMatrix[i][j] = 0;
            }
        }
    }

    ~Graph() {
        for (int i = 0; i < n; i++) {
            delete[] adjMatrix[i];
        }
        delete[] adjMatrix;
    }

    void addEdge(int u, int v, int w = 1) {
        if (u >= 0 && u < n && v >= 0 && v < n) {
            adjMatrix[u][v] = w;
            if (!isDirected && u != v) {
                adjMatrix[v][u] = w;
            }
        }
    }

    void removeEdge(int u, int v) {
        if (u >= 0 && u < n && v >= 0 && v < n) {
            adjMatrix[u][v] = 0;
            if (!isDirected) {
                adjMatrix[v][u] = 0;
            }
        }
    }

    void setDirected(bool directed) {
        isDirected = directed;
        if (!directed) {
            for (int i = 0; i < n; i++) {
                for (int j = i + 1; j < n; j++) {
                    if (adjMatrix[i][j] != 0 || adjMatrix[j][i] != 0) {
                        int weight = (adjMatrix[i][j] != 0) ? adjMatrix[i][j] : adjMatrix[j][i];
                        adjMatrix[i][j] = weight;
                        adjMatrix[j][i] = weight;
                    }
                }
            }
        }
    }

    bool getIsDirected() {
        return isDirected;
    }

    Graph* removeVertex(int vertex) {
        if (vertex < 0 || vertex >= n) 
            return this;

        Graph* newGraph = new Graph(n - 1, isDirected);

        int newI = 0;
        for (int i = 0; i < n; i++) {
            if (i == vertex) {
                continue;
            }

            int newJ = 0;
            for (int j = 0; j < n; j++) {
                if (j == vertex) {
                    continue;
                }

                if (adjMatrix[i][j] != 0) {
                    newGraph->addEdge(newI, newJ, adjMatrix[i][j]);
                }
                newJ++;
            }
            newI++;
        }

        return newGraph;
    }

    string getMatrix() {
        string result = "[";
        for (int i = 0; i < n; i++) {
            result += "[";
            for (int j = 0; j < n; j++) {
                result += intToString(adjMatrix[i][j]);
                if (j < n - 1) result += ",";
            }
            result += "]";
            if (i < n - 1) result += ",";
        }
        result += "]";
        return result;
    }

    string bfs(int start) {
        if (start < 0 || start >= n) 
            return "[]";

        bool* visited = new bool[n];
        for (int i = 0; i < n; i++) visited[i] = false;

        Queue q;
        visited[start] = true;
        q.enqueue(start);

        string result = "[";
        bool first = true;

        while (!q.empty()) {
            int node = q.Front();
            q.dequeue();

            if (!first) result += ",";
            first = false;
            result += intToString(node);

            for (int neighbor = 0; neighbor < n; neighbor++) {
                if (adjMatrix[node][neighbor] != 0 && !visited[neighbor]) {
                    visited[neighbor] = true;
                    q.enqueue(neighbor);
                }
            }
        }

        result += "]";
        delete[] visited;
        return result;
    }

    string dfs(int start) {
        if (start < 0 || start >= n) 
            return "[]";

        bool* visited = new bool[n];
        for (int i = 0; i < n; i++) visited[i] = false;

        Stack s;
        s.push(start);

        string result = "[";
        bool first = true;

        while (!s.empty()) {
            int node = s.Top();
            s.pop();

            if (!visited[node]) {
                visited[node] = true;

                if (!first) result += ",";
                first = false;
                result += intToString(node);

                for (int neighbor = n - 1; neighbor >= 0; neighbor--) {
                    if (adjMatrix[node][neighbor] != 0 && !visited[neighbor]) {
                        s.push(neighbor);
                    }
                }
            }
        }

        result += "]";
        delete[] visited;
        return result;
    }

    string dijkstra(int start) {
        if (start < 0 || start >= n) 
            return "[]";

        int* dist = new int[n];
        bool* visited = new bool[n];

        for (int i = 0; i < n; i++) {
            dist[i] = 999999;
            visited[i] = false;
        }

        dist[start] = 0;
        MinHeap pq(n * n);
        pq.push(start, 0);

        while (!pq.empty()) {
            PQNode current = pq.pop();
            int u = current.vertex;

            if (visited[u]) continue;
            visited[u] = true;

            for (int v = 0; v < n; v++) {
                if (adjMatrix[u][v] != 0 && !visited[v]) {
                    int weight = adjMatrix[u][v];
                    if (dist[u] + weight < dist[v]) {
                        dist[v] = dist[u] + weight;
                        pq.push(v, dist[v]);
                    }
                }
            }
        }

        string result = "[";
        for (int i = 0; i < n; i++) {
            result += intToString(dist[i]);
            if (i < n - 1) result += ",";
        }
        result += "]";

        delete[] dist;
        delete[] visited;
        return result;
    }

    string primMST() {
        if (isDirected) {
            return "[]";
        }

        int* key = new int[n];
        int* parent = new int[n];
        bool* inMST = new bool[n];

        for (int i = 0; i < n; i++) {
            key[i] = 999999;
            parent[i] = -1;
            inMST[i] = false;
        }

        key[0] = 0;
        MinHeap pq(n * n);
        pq.push(0, 0);

        string result = "[";
        bool first = true;

        while (!pq.empty()) {
            PQNode current = pq.pop();
            int u = current.vertex;

            if (inMST[u]) continue;
            inMST[u] = true;

            if (parent[u] != -1) {
                if (!first) result += ",";
                first = false;
                result += intToString(parent[u]) + "-" +
                    intToString(u) + ":" +
                    intToString(adjMatrix[parent[u]][u]);
            }

            for (int v = 0; v < n; v++) {
                if (adjMatrix[u][v] != 0 && !inMST[v] && adjMatrix[u][v] < key[v]) {
                    key[v] = adjMatrix[u][v];
                    parent[v] = u;
                    pq.push(v, key[v]);
                }
            }
        }

        result += "]";

        delete[] key;
        delete[] parent;
        delete[] inMST;
        return result;
    }

    void clear() {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                adjMatrix[i][j] = 0;
            }
        }
    }

    int getVertexCount() {
        return n;
    }
};

// ===================== 4. HASH TABLE (CHAINING) =====================
struct HashNode {
    int key;
    int value;
    HashNode* next;

    HashNode(int k, int v) : key(k), value(v), next(NULL) {}
};

class HashTable {
private:
    static const int TABLE_SIZE = 10;
    HashNode** table;

    int abs(int x) { return x < 0 ? -x : x; }

    int hashFunction(int key) {
        return abs(key) % TABLE_SIZE;
    }

public:
    HashTable() {
        table = new HashNode * [TABLE_SIZE];
        for (int i = 0; i < TABLE_SIZE; i++) {
            table[i] = NULL;
        }
    }

    ~HashTable() {
        for (int i = 0; i < TABLE_SIZE; i++) {
            HashNode* current = table[i];
            while (current) {
                HashNode* temp = current;
                current = current->next;
                delete temp;
            }
        }
        delete[] table;
    }

    void insert(int key, int value) {
        int index = hashFunction(key);

        HashNode* current = table[index];
        while (current) {
            if (current->key == key) {
                current->value = value;
                return;
            }
            current = current->next;
        }

        HashNode* newNode = new HashNode(key, value);
        newNode->next = table[index];
        table[index] = newNode;
    }

    int search(int key) {
        int index = hashFunction(key);

        HashNode* current = table[index];
        while (current) {
            if (current->key == key) {
                return current->value;
            }
            current = current->next;
        }

        return -1;
    }

    string getTable() {
        string result = "[";

        for (int i = 0; i < TABLE_SIZE; i++) {
            result += "[";

            HashNode* current = table[i];
            bool first = true;
            while (current) {
                if (!first) result += ",";
                first = false;
                result += intToString(current->key) + ":" +
                    intToString(current->value);
                current = current->next;
            }

            result += "]";
            if (i < TABLE_SIZE - 1) result += ",";
        }

        result += "]";
        return result;
    }

    void clear() {
        for (int i = 0; i < TABLE_SIZE; i++) {
            HashNode* current = table[i];
            while (current) {
                HashNode* temp = current;
                current = current->next;
                delete temp;
            }
            table[i] = NULL;
        }
    }
};

// ===================== EMSCRIPTEN BINDINGS =====================
EMSCRIPTEN_BINDINGS(data_structures) {
    class_<BinaryHeap>("BinaryHeap")
        .constructor<bool>()
        .function("insert", &BinaryHeap::insert)
        .function("extractTop", &BinaryHeap::extractTop)
        .function("getArray", &BinaryHeap::getArray)
        .function("clear", &BinaryHeap::clear)
        .function("convertToMinHeap", &BinaryHeap::convertToMinHeap)
        .function("convertToMaxHeap", &BinaryHeap::convertToMaxHeap)
        .function("getIsMinHeap", &BinaryHeap::getIsMinHeap);

    class_<AVLTree>("AVLTree")
        .constructor<>()
        .function("insert", &AVLTree::insert)
        .function("remove", &AVLTree::remove)
        .function("getTree", &AVLTree::getTree)
        .function("clear", &AVLTree::clear)
        .function("getLastRotation", &AVLTree::getLastRotation);

    class_<Graph>("Graph")
        .constructor<int, bool>()
        .function("addEdge", &Graph::addEdge)
        .function("removeEdge", &Graph::removeEdge)
        .function("setDirected", &Graph::setDirected)
        .function("getIsDirected", &Graph::getIsDirected)
        .function("removeVertex", &Graph::removeVertex, allow_raw_pointers())
        .function("getMatrix", &Graph::getMatrix)
        .function("bfs", &Graph::bfs)
        .function("dfs", &Graph::dfs)
        .function("dijkstra", &Graph::dijkstra)
        .function("primMST", &Graph::primMST)
        .function("clear", &Graph::clear)
        .function("getVertexCount", &Graph::getVertexCount);

    class_<HashTable>("HashTable")
        .constructor<>()
        .function("insert", &HashTable::insert)
        .function("search", &HashTable::search)
        .function("getTable", &HashTable::getTable)
        .function("clear", &HashTable::clear);
}